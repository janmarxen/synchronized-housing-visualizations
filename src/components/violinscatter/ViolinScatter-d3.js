import * as d3 from 'd3'
import { kernelEpanechnikov, kernelDensityEstimator } from '../../utils/helper'

/*
 ViolinScatterD3
 ----------------
 Lightweight D3 renderer used inside a React container component.

 Responsibilities:
 - create(svg container) is called once when the component mounts or when the container size
   changes. It sets up basic SVG groups and pointer handlers for drawing persistent selection
   rectangles (multiBrushes).
 - render(data, controllerMethods) is called whenever new data arrives or parent requests a
   render. It computes scales, kernel densities and draws n violins per x-category based on the
   variables array provided by the parent (see variable normalization below).
 - highlightSelected(selectedItems) is called from React to dim non-selected points.

 This file intentionally keeps logic imperative and compact; the comments explain reasons
 behind common D3 patterns so beginners can follow along.
*/

class ViolinScatterD3 {
  // Margins around the drawing area. Left margin is larger to make room for y-axis labels
  margin = { top: 20, right: 16, bottom: 40, left: 120 };
  size;
  width;
  height;
  svg;
  // default opacity for points
  defaultOpacity = 0.85;

  // element reference is passed from the React container (a div)
  constructor(el) { this.el = el }

  /*
    create(config)
    - config.size: {width, height}
    - config.variables: optional array of variable definitions
    Purpose: prepare SVG, groups and pointer handlers. Safe to call multiple times; it clears
    previous contents so we always start from a clean slate.
  */
  create = function(config) {
    // Clear any previous svg content inside the container element
    try {
      d3.select(this.el).selectAll('*').remove();
    } catch (e) {
      console.error('ViolinScatterD3.create: failed to clear el', e);
    }

    // Store size information (fallbacks if not provided)
    this.size = { width: config.size.width, height: config.size.height };
    try { console.debug('ViolinScatterD3.create config:', config, 'el:', this.el && this.el.tagName); } catch(e){}
    if (!this.size.width) this.size.width = 800;
    if (!this.size.height) this.size.height = 400;
    // inner drawing area (subtract margins)
    this.width = this.size.width - this.margin.left - this.margin.right;
    this.height = this.size.height - this.margin.top - this.margin.bottom;

    // ensure margins are numeric to avoid invalid transform strings later
    const ml = Number(this.margin && this.margin.left) || 0;
    const mr = Number(this.margin && this.margin.right) || 0;
    const mt = Number(this.margin && this.margin.top) || 0;
    const mb = Number(this.margin && this.margin.bottom) || 0;
    try { console.debug('ViolinScatterD3.create computed sizes:', {ml,mr,mt,mb, width:this.width, height:this.height}); } catch(e){}
    const svgWidth = Number(this.width) + ml + mr;
    const svgHeight = Number(this.height) + mt + mb;

    // Create the main svg element and a group (<g>) that is offset by the margins.
    // All drawing happens inside that <g> so coordinates are in the inner area.
    try {
      this.svg = d3.select(this.el).append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
        .attr('transform', `translate(${ml},${mt})`);
    } catch (e) {
      // Defensive fallback: if the transform creation fails, try a simpler append so
      // at least we have an svg and can continue.
      console.error('ViolinScatterD3.create: failed to create svg/g transform', {svgWidth, svgHeight, ml, mt, e});
      try {
        this.svg = d3.select(this.el).append('svg').attr('width', svgWidth).attr('height', svgHeight).append('g');
      } catch (e2) { console.error('ViolinScatterD3.create fallback failed', e2); }
    }

    // groups used for drawing: rowsGroup contains violins and points, sepGroup contains separators
    this.rowsGroup = this.svg.append('g').attr('class','rows-group');
    this.sepGroup = this.svg.append('g').attr('class','sep-group');
    // placeholder group for x axis text (ticks are drawn manually near the bottom)
    this.svg.append('g').attr('class','xAxis').attr('transform', `translate(0,${isFinite(this.height)?this.height:0})`);

    // a tiny tooltip element (HTML) used to show brush ranges; kept hidden until needed
    d3.select(this.el).style('position','relative');
    d3.select(this.el).selectAll('.brush-tooltip').remove();
    this.tooltip = d3.select(this.el).append('div').attr('class','brush-tooltip').style('display','none');

    // state for manual (persistent) multi-rectangle selections
    this.multiBrushes = [];
    this._creating = false;
    this._currentRect = null;
    // variables may be provided by the container; fall back to a sensible default
    this.variables = (config && config.variables) || ['bedrooms','stories','bathrooms'];

    // Set up simple pointer handlers on the svg element so users can draw persistent
    // rectangular selections (click + drag). These rectangles are stored in multiBrushes.
    const svgElem = d3.select(this.el).select('svg');
    svgElem.on('mousedown.multiRect', (event) => {
      if (event.button !== 0) return; // only left button
      const [mx,my] = d3.pointer(event, this.svg.node());
      this._creating = true;
      this._createStart = [mx,my];
      // create a visual rect while the user drags
      this._currentRect = this.svg.append('rect')
        .attr('class','multi-brush')
        .attr('x', mx).attr('y', my).attr('width', 0).attr('height', 0)
        .style('fill','rgba(74,144,226,0.12)')
        .style('stroke','#1f6fbf')
        .style('stroke-width',1.2)
        .style('pointer-events','all');
    });

    // update the rectangle while dragging
    svgElem.on('mousemove.multiRect', (event) => {
      if (!this._creating || !this._currentRect) return;
      const [mx,my] = d3.pointer(event, this.svg.node());
      const [sx,sy] = this._createStart;
      const x = Math.min(sx,mx);
      const y = Math.min(sy,my);
      const w = Math.abs(mx - sx);
      const h = Math.abs(my - sy);
      this._currentRect.attr('x', x).attr('y', y).attr('width', Math.max(0,w)).attr('height', Math.max(0,h));
    });

    // finish the rectangle on mouseup: either discard tiny rectangles or keep them as persistent brushes
    svgElem.on('mouseup.multiRect', (event) => {
      if (!this._creating) return;
      this._creating = false;
      const [mx,my] = d3.pointer(event, this.svg.node());
      const [sx,sy] = this._createStart;
      const x = Math.min(sx,mx);
      const y = Math.min(sy,my);
      const w = Math.abs(mx - sx);
      const h = Math.abs(my - sy);
      if (this._currentRect) {
        if (w < 4 || h < 4) {
          // too small -> ignore
          this._currentRect.remove();
        } else {
          // store bbox as pixel coords and make rect non-interactive so future pointer events
          // don't accidentally trigger it
          const bbox = {x, y, x2: x + w, y2: y + h};
          this.multiBrushes.push({rect: this._currentRect, bbox});
          this._currentRect.style('pointer-events','none');
          // compute selected items inside all persistent rectangles
          this.updateBrushesSelection();
        }
        this._currentRect = null;
      }
    });
  }

  // A small helper called when a brush interaction starts (used to show tooltip)
  _onBrushStart = function(event){
    if (this.tooltip) this.tooltip.style('display','block');
  }

  /*
    _onBrush
    This was originally wired for an interactive d3.brush; here it is retained for
    compatibility. It computes the pixel bounds of the selection and collects points
    whose screen positions fall inside the selection rectangle.
  */
  _onBrush = function(event){
    if (!this.currentData || !this.currentControllerMethods || !this.y) return;
    if (event.selection){
      // event.selection can be an array of two points [[x0,y0],[x1,y1]] or for 1D brushes
      // an array [y0,y1]. We normalize both cases to pixel bounds: left,right,top,bottom
      let left = 0, right = this.width, top = 0, bottom = this.height;
      if (Array.isArray(event.selection[0])) {
        left = Math.min(event.selection[0][0], event.selection[1][0]);
        right = Math.max(event.selection[0][0], event.selection[1][0]);
        top = Math.min(event.selection[0][1], event.selection[1][1]);
        bottom = Math.max(event.selection[0][1], event.selection[1][1]);
      } else {
        top = Math.min(event.selection[0], event.selection[1]);
        bottom = Math.max(event.selection[0], event.selection[1]);
      }

      // iterate over drawn points (class .vpoint) and test their cx/cy attributes
      const selected = [];
      this.rowsGroup.selectAll('.vpoint').each((d, i, nodes) => {
        const node = nodes[i];
        const cx = parseFloat(d3.select(node).attr('cx'));
        const cy = parseFloat(d3.select(node).attr('cy'));
        if (cx >= left && cx <= right && cy >= top && cy <= bottom) selected.push(d.original);
      });
      const unique = Array.from(new Map(selected.map(s=>[s.index,s])).values());
      // pass selection back to controller (React) so app state can update
      this.currentControllerMethods.handleOnBrush(unique);
      if (this.tooltip) {
        // show the price range covered by the selection (convert pixel -> value via y scale)
        const p0 = this.y.invert(bottom);
        const p1 = this.y.invert(top);
        const fmt = d3.format(',.0f');
        this.tooltip.style('display','block').html(`${fmt(p0)} — ${fmt(p1)}`);
      }
    } else {
      // no selection -> clear
      this.currentControllerMethods.handleOnBrush([]);
      if (this.tooltip) this.tooltip.style('display','none');
    }
  }

  _onBrushEnd = function(event){
    if (!event.selection) {
      try { if (this.currentControllerMethods) this.currentControllerMethods.handleOnBrush([]); } catch(e){}
      if (this.tooltip) this.tooltip.style('display','none');
    }
  }

  /*
    updateBrushesSelection
    For every persistent rectangle in multiBrushes, check which points fall inside and
    inform the controller. This method is used when a new rectangle is added or removed.
  */
  updateBrushesSelection = function(){
    if (!this.currentControllerMethods) return;
    const selected = [];
    this.rowsGroup.selectAll('.vpoint').each((d, i, nodes) => {
      const node = nodes[i];
      const cx = parseFloat(d3.select(node).attr('cx'));
      const cy = parseFloat(d3.select(node).attr('cy'));
      for (let br of (this.multiBrushes||[])){
        const b = br.bbox;
        if (cx >= b.x && cx <= b.x2 && cy >= b.y && cy <= b.y2) { selected.push(d.original); break; }
      }
    });
    const unique = Array.from(new Map(selected.map(s=>[s.index,s])).values());
    try { this.currentControllerMethods.handleOnBrush(unique); } catch(e){}
  }

  clearAllBrushes = function(){
    if (this.multiBrushes && this.multiBrushes.length>0){
      this.multiBrushes.forEach(b=>{ try{ b.rect.remove(); }catch(e){} });
      this.multiBrushes = [];
    }
    try { if (this.currentControllerMethods) this.currentControllerMethods.handleOnBrush([]); } catch(e){}
  }

  // kernel functions are imported from utils/helper.js so they can be reused across components

  /*
    render(data, controllerMethods)
    - data: array of raw data objects (must contain `price` and categorical counts like bedrooms)
    - controllerMethods: object with callbacks and possibly shared yDomain and variables

    This method computes the y scale (price), then for each x-category (here 1..5) computes
    a kernel density for each variable (e.g. bedrooms, bathrooms, stories) and renders a
    violin and its points. The number of violins per band equals normVars.length.
  */
  render = function(data, controllerMethods) {
    if (!this.svg) return;
    if (!data || data.length === 0) return;

  const prices = data.map(d => +d.price).filter(v => !isNaN(v));
  if (prices.length === 0) return;
  // Allow parent to pass a yDomain (shared scale) so both plots align vertically
  const domainFromController = (controllerMethods && controllerMethods.yDomain) ? controllerMethods.yDomain : null;
  const yDomain = domainFromController && domainFromController.length===2 ? domainFromController : [d3.min(prices), d3.max(prices)];
  const y = d3.scaleLinear().domain(yDomain).nice().range([this.height, 0]);
  // store the y scale on the instance because other handlers (brush) use it
  this.y = y;

  // x categories (here hard-coded to 1..5). If your data has different categories you can
  // adapt unionCounts accordingly or pass category definitions from the container.
  const unionCounts = [1,2,3,4,5];
  // a band scale divides the horizontal space into discrete bands for each category
  const xBand = d3.scaleBand().domain(unionCounts).range([0, this.width]).padding(0.06);

    // ySamples are the values at which the KDE is evaluated. 80 samples give a reasonably smooth curve.
  const ySamples = d3.range(y.domain()[0], y.domain()[1], (y.domain()[1]-y.domain()[0]) / 80);
  const kde = kernelDensityEstimator(kernelEpanechnikov((y.domain()[1]-y.domain()[0]) / 40), ySamples);

    // Normalize variables: the container may pass objects or strings. We convert everything to
    // objects {name,label,fill,stroke,pointFill,idx} so rendering code can be uniform.
    const variables = (controllerMethods && controllerMethods.variables) || this.variables || ['bedrooms','stories','bathrooms'];
    const normVars = variables.map((v,i)=>{
      if (typeof v === 'string') return { name: v, label: v, fill: null, stroke: null, pointFill: null, idx: i };
      return Object.assign({label: v.name, fill: null, stroke: null, pointFill: null, idx: i}, v);
    });

    // compute density arrays for each variable name and each category
    const densities = {};
    let globalMax = 0;
    normVars.forEach(vobj => { densities[vobj.name] = {}; });
    unionCounts.forEach(c => {
      normVars.forEach(vobj => {
        const vals = data.filter(d => +d[vobj.name] === c).map(d=>+d.price).filter(v=>!isNaN(v));
        const dvals = vals.length>0 ? kde(vals) : ySamples.map(s=>[s,0]);
        densities[vobj.name][c] = dvals;
        const m = d3.max(dvals, d=>d[1])||0;
        globalMax = Math.max(globalMax, m, globalMax);
      });
    });

  // determine the maximum half-width a violin can take inside its band
  const halfBand = xBand.bandwidth() / 2;
  const violinMaxHalfWidth = Math.max(12, halfBand * 0.72);
    const densityScale = d3.scaleLinear().domain([0, globalMax||1]).range([0, violinMaxHalfWidth]);

  // clear previous drawing (simple strategy: redraw everything every render)
  this.rowsGroup.selectAll('*').remove();

  // compute separators between bands (for visual grouping). These are vertical lines.
  const separators = unionCounts.slice(0,-1).map((c,i)=>{
    const next = unionCounts[i+1];
    const pos = (xBand(c) + xBand(next)) / 2 + xBand.bandwidth() / 2;
    return {x: pos};
  });
  const sepSel = this.sepGroup.selectAll('.sep-line').data(separators);
  const sepEnter = sepSel.enter().append('line').attr('class','sep-line');
  sepEnter.merge(sepSel).attr('x1',d=>d.x).attr('x2',d=>d.x).attr('y1',0).attr('y2',this.height);
  sepSel.exit().remove();

  // For each category, compute centers for each variable and draw violin + points
  unionCounts.forEach(c => {
      const bandStart = xBand(c);
      // compute centers for each variable evenly spaced in the band
      const nVars = normVars.length;
      const centers = normVars.map((vobj,vi)=> bandStart + xBand.bandwidth() * ((vi+1)/(nVars+1)) );
      // render violins and points for each normalized variable
      normVars.forEach((vobj, vi)=>{
        const center = centers[vi];
        const dVar = densities[vobj.name][c];
        const areaVar = d3.area()
          .curve(d3.curveBasis)
          .y(d => y(d[0]))
          .x0(d => center - densityScale(d[1]))
          .x1(d => center + densityScale(d[1]));
        const vSel = this.rowsGroup.selectAll(`.violin-v${vi}-${c}`).data([dVar]);
        const vEnter = vSel.enter().append('path').attr('class', `violin violin-v${vi} violin-v${vi}-${c}`);
        vEnter.merge(vSel)
          .attr('d', areaVar)
          .style('fill', vobj.fill || '#ddd')
          .style('stroke', vobj.stroke || '#999')
          .style('opacity', 0.55);
        vSel.exit().remove();

        // points for this variable: compute a jittered x inside the violin width
        const points = data.filter(d=>+d[vobj.name]===c).map(d=>({original:d, py:y(+d.price)}));
        points.forEach(p=>{ const ix=d3.bisectLeft(ySamples, +p.original.price); const densVal=(dVar[ix]&&dVar[ix][1])||0; const maxJ=densityScale(densVal); p.jitterX = center + (Math.random()*2 -1) * Math.max(1, maxJ*0.9); });
        const pSel = this.rowsGroup.selectAll(`.point-v${vi}-${c}`).data(points, d=>d.original.index);
        const pEnter = pSel.enter().append('circle').attr('class', `vpoint point-v${vi}`).attr('r',3).on('click',(e,d)=>controllerMethods.handleOnClick(d.original));
        // draw points and give them a fill color (variable-specific) if provided
        pEnter.merge(pSel).attr('cx',d=>d.jitterX).attr('cy',d=>d.py).style('fill', vobj.pointFill || '#666').style('opacity',this.defaultOpacity).style('stroke','none');
        pSel.exit().remove();
      });

      // draw a simple x-axis tick label for this category (centered)
      const tickSel = this.rowsGroup.selectAll(`.count-tick-${c}`).data([c]);
      const tickEnter = tickSel.enter().append('text').attr('class',`count-tick-${c}`);
      // show only the x axis value (no counts in parentheses)
      tickEnter.merge(tickSel).attr('x', bandStart + xBand.bandwidth()/2).attr('y', this.height + 14).text(`${c}`).attr('text-anchor','middle');
      tickSel.exit().remove();
    });

    // draw or update the x-axis label (centered under ticks)
    const xLabelSel = this.svg.selectAll('.x-axis-label').data([null]);
    const xLabelEnter = xLabelSel.enter().append('text').attr('class','x-axis-label');
    xLabelEnter.merge(xLabelSel)
      .attr('x', this.width / 2)
      .attr('y', this.height + 30)
      .attr('text-anchor','middle')
      .style('font-size','12px')
      .style('fill','#333')
      .text('Count');
    xLabelSel.exit().remove();

    // remove any previously drawn y axis (we are not drawing a y axis here; App manages shared y-axis)
  this.svg.selectAll('.yAxis').remove();

  // keep references for other methods (brush handlers etc.)
  this.currentData = data;
  this.currentControllerMethods = controllerMethods;
  if (this.brush) {
    this.brush.extent([[0,0],[this.width,this.height]]);
    if (this.brushG) this.brushG.call(this.brush);
  }
  }

  /*
    highlightSelected(selectedItems)
    Called by React to indicate which items are currently selected. For each drawn point
    (class .vpoint) we change opacity and stroke. Violins are dimmed a bit when there is a selection.
  */
  highlightSelected = function(selectedItems) {
    const selSet = new Set((selectedItems||[]).map(s=>s.index));
    this.rowsGroup.selectAll('.vpoint')
      .style('opacity', d => selSet.size===0 ? this.defaultOpacity : (selSet.has(d.original.index) ? 1 : 0.12))
      .style('stroke', d => selSet.has(d.original.index) ? '#333' : 'none')
      .style('stroke-width', d => selSet.has(d.original.index) ? 1.2 : 0);
    // keep violins at a steady opacity; don't attempt complex per-violin dimming here
    this.rowsGroup.selectAll('.violin').style('opacity', selSet.size===0 ? 0.9 : 0.55);
  }

  // clear everything from the container (used when unmounting)
  clear = function(){ d3.select(this.el).selectAll('*').remove(); }
}

export default ViolinScatterD3;
