import * as d3 from 'd3'

class StackedCountsD3 {
  margin = { top: 20, right: 16, bottom: 40, left: 120 };
  size;
  width;
  height;
  svg;
  defaultOpacity = 0.85;

  constructor(el) { this.el = el }

  create = function(config) {
    try {
      // clear previous contents so recreate works reliably
      d3.select(this.el).selectAll('*').remove();
    } catch (e) {
      console.error('StackedCountsD3.create: failed to clear el', e);
    }
    this.size = { width: config.size.width, height: config.size.height };
    // debug: log incoming config and element refs to help trace undefined values
    try { console.debug('StackedCountsD3.create config:', config, 'el:', this.el && this.el.tagName); } catch(e){}
    // fall back to sensible defaults when measurements are not available yet
    if (!this.size.width) this.size.width = 800;
    if (!this.size.height) this.size.height = 400;
    this.width = this.size.width - this.margin.left - this.margin.right;
    this.height = this.size.height - this.margin.top - this.margin.bottom;

    // ensure numeric margins
    const ml = Number(this.margin && this.margin.left) || 0;
    const mr = Number(this.margin && this.margin.right) || 0;
    const mt = Number(this.margin && this.margin.top) || 0;
    const mb = Number(this.margin && this.margin.bottom) || 0;
    try { console.debug('StackedCountsD3.create computed sizes:', {ml,mr,mt,mb, width:this.width, height:this.height}); } catch(e){}
    const svgWidth = Number(this.width) + ml + mr;
    const svgHeight = Number(this.height) + mt + mb;
    try {
      this.svg = d3.select(this.el).append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
        .attr('transform', `translate(${ml},${mt})`);
    } catch (e) {
      console.error('StackedCountsD3.create: failed to create svg/g transform', {svgWidth, svgHeight, ml, mt, e});
      // fallback: create svg without transform
      try {
        this.svg = d3.select(this.el).append('svg').attr('width', svgWidth).attr('height', svgHeight).append('g');
      } catch (e2) { console.error('StackedCountsD3.create fallback failed', e2); }
    }

    // groups
    this.rowsGroup = this.svg.append('g').attr('class','rows-group');
    this.svg.append('g').attr('class','xAxis').attr('transform', `translate(0,${isFinite(this.height)?this.height:0})`);

    // tooltip for brush range (a div positioned inside the container)
    // make sure container is positioned so absolute tooltip works
    d3.select(this.el).style('position','relative');
    // remove previous tooltip if any
    d3.select(this.el).selectAll('.brush-tooltip').remove();
    this.tooltip = d3.select(this.el).append('div').attr('class','brush-tooltip').style('display','none');

  // create a 2D brush (allow horizontal + vertical selection)
  this.brush = d3.brush().extent([[0,0],[this.width,this.height]]);
    // brushG appended at end so it's on top
    this.brushG = this.svg.append('g').attr('class','brush');
    this.brushG.call(this.brush);
    // set handlers to instance methods that will use current data/scale stored during render
    this.brush.on('start', (event) => this._onBrushStart(event));
    this.brush.on('brush', (event) => this._onBrush(event));
    this.brush.on('end', (event) => this._onBrushEnd(event));

    // (debug overlay removed) brush and tooltip remain persistent
  }

  // brush handlers use current data and controllerMethods set in render()
  _onBrushStart = function(event){
    if (this.tooltip) this.tooltip.style('display','block');
  }

  _onBrush = function(event){
    if (!this.currentData || !this.currentControllerMethods || !this.y) return;
    if (event.selection){
      // event.selection can be [[x0,y0],[x1,y1]] for 2D brush
      let left = 0, right = this.width, top = 0, bottom = this.height;
      if (Array.isArray(event.selection[0])) {
        left = Math.min(event.selection[0][0], event.selection[1][0]);
        right = Math.max(event.selection[0][0], event.selection[1][0]);
        top = Math.min(event.selection[0][1], event.selection[1][1]);
        bottom = Math.max(event.selection[0][1], event.selection[1][1]);
      } else {
        // fallback for single-axis selection [y0,y1]
        top = Math.min(event.selection[0], event.selection[1]);
        bottom = Math.max(event.selection[0], event.selection[1]);
      }

      // find all points whose pixel coords lie within the selection bbox
      const selected = [];
      this.rowsGroup.selectAll('.vpoint').each((d, i, nodes) => {
        const node = nodes[i];
        const cx = parseFloat(d3.select(node).attr('cx'));
        const cy = parseFloat(d3.select(node).attr('cy'));
        if (cx >= left && cx <= right && cy >= top && cy <= bottom) selected.push(d.original);
      });
      const unique = Array.from(new Map(selected.map(s=>[s.index,s])).values());
      this.currentControllerMethods.handleOnBrush(unique);
      if (this.tooltip) {
        const p0 = this.y.invert(bottom);
        const p1 = this.y.invert(top);
        const fmt = d3.format(',.0f');
        this.tooltip.style('display','block').html(`${fmt(p0)} — ${fmt(p1)}`);
      }
    } else {
      this.currentControllerMethods.handleOnBrush([]);
      if (this.tooltip) this.tooltip.style('display','none');
    }
  }

  _onBrushEnd = function(event){
    if (!event.selection) {
      // inform controller that brush selection cleared
      try { if (this.currentControllerMethods) this.currentControllerMethods.handleOnBrush([]); } catch(e){}
      if (this.tooltip) this.tooltip.style('display','none');
    }
  }

  // Epanechnikov kernel
  kernelEpanechnikov = function(k) {
    return function(v) {
      v = v / k;
      return Math.abs(v) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
    };
  }

  kernelDensityEstimator = function(kernel, xValues) {
    return function(sample) {
      return xValues.map(function(x) {
        return [x, d3.mean(sample, function(v) { return kernel(x - v); }) || 0];
      });
    };
  }

  render = function(data, controllerMethods) {
    if (!this.svg) return;
    if (!data || data.length === 0) return;

  // price scale (y axis) - allow controller to pass a yDomain to sync scales
  const prices = data.map(d => +d.price).filter(v => !isNaN(v));
  if (prices.length === 0) return;
  const domainFromController = (controllerMethods && controllerMethods.yDomain) ? controllerMethods.yDomain : null;
  const yDomain = domainFromController && domainFromController.length===2 ? domainFromController : [d3.min(prices), d3.max(prices)];
  const y = d3.scaleLinear().domain(yDomain).nice().range([this.height, 0]);
  // keep scale on instance for brush handlers
  this.y = y;

    // (previously split view) now using full height for price scale

  // x domain fixed to 1..5 only (as requested)
  const unionCounts = [1,2,3,4,5];
  // x positions for each integer count
  // reduce padding to allow larger per-category space
  const xBand = d3.scaleBand().domain(unionCounts).range([0, this.width]).padding(0.12);

    // KDE samples along price domain (yDomain)
    const ySamples = d3.range(y.domain()[0], y.domain()[1], (y.domain()[1]-y.domain()[0]) / 80);
    const kde = this.kernelDensityEstimator(this.kernelEpanechnikov((y.domain()[1]-y.domain()[0]) / 40), ySamples);

    // compute densities for both bed and bath per count, and global max density to normalize widths
    const densitiesBed = {};
    const densitiesBath = {};
    let globalMax = 0;
    unionCounts.forEach(c => {
      const bedVals = data.filter(d => +d.bedrooms === c).map(d=>+d.price).filter(v=>!isNaN(v));
      const bathVals = data.filter(d => +d.bathrooms === c).map(d=>+d.price).filter(v=>!isNaN(v));
      const dBed = bedVals.length>0 ? kde(bedVals) : ySamples.map(s=>[s,0]);
      const dBath = bathVals.length>0 ? kde(bathVals) : ySamples.map(s=>[s,0]);
      densitiesBed[c] = dBed;
      densitiesBath[c] = dBath;
      const m1 = d3.max(dBed, d=>d[1])||0;
      const m2 = d3.max(dBath, d=>d[1])||0;
      globalMax = Math.max(globalMax, m1, m2);
    });

    // each violin will occupy about half the band; leave a small gap between them
  const halfBand = xBand.bandwidth() / 2;
  // allocate a larger portion of the band to each violin now that we can scroll
  const violinMaxHalfWidth = Math.max(12, halfBand * 0.6); // maximum half-width for each violin
    const densityScale = d3.scaleLinear().domain([0, globalMax||1]).range([0, violinMaxHalfWidth]);
  // clear previous group content then draw violins and points per union count, overlapped
  this.rowsGroup.selectAll('*').remove();
  unionCounts.forEach(c => {
      const bandStart = xBand(c);
      const centerLeft = bandStart + xBand.bandwidth() * 0.25; // left sub-center (bedrooms)
      const centerRight = bandStart + xBand.bandwidth() * 0.75; // right sub-center (bathrooms)
      const dBed = densitiesBed[c];
      const dBath = densitiesBath[c];

      // bedroom violin (left)
      const areaBed = d3.area()
        .curve(d3.curveBasis)
        .y(d => y(d[0]))
        .x0(d => centerLeft - densityScale(d[1]))
        .x1(d => centerLeft + densityScale(d[1]));
      const vb = this.rowsGroup.selectAll(`.violin-bed-${c}`).data([dBed]);
      const vbEnter = vb.enter().append('path').attr('class', `violin violin-bed-${c}`);
      vbEnter.merge(vb)
        .attr('d', areaBed)
        .style('fill', '#cfe7ff')
        .style('stroke', '#79b1ff')
        .style('opacity', 0.6);
      vb.exit().remove();

      // bathroom violin (right)
      const areaBath = d3.area()
        .curve(d3.curveBasis)
        .y(d => y(d[0]))
        .x0(d => centerRight - densityScale(d[1]))
        .x1(d => centerRight + densityScale(d[1]));
      const va = this.rowsGroup.selectAll(`.violin-bath-${c}`).data([dBath]);
      const vaEnter = va.enter().append('path').attr('class', `violin violin-bath-${c}`);
      vaEnter.merge(va)
        .attr('d', areaBath)
        .style('fill', '#ffe9c9')
        .style('stroke', '#ffb86a')
        .style('opacity', 0.55);
      va.exit().remove();

      // points: bedrooms
      const bedPoints = data.filter(d=>+d.bedrooms===c).map(d=>({original:d, py:y(+d.price)}));
  bedPoints.forEach(p=>{ const ix=d3.bisectLeft(ySamples, +p.original.price); const densVal=(dBed[ix]&&dBed[ix][1])||0; const maxJ=densityScale(densVal); p.jitterX = centerLeft + (Math.random()*2 -1) * Math.max(1, maxJ*0.9); });
      const bpSel = this.rowsGroup.selectAll(`.point-bed-${c}`).data(bedPoints, d=>d.original.index);
      const bpEnter = bpSel.enter().append('circle').attr('class', `vpoint point-bed`).attr('r',3).on('click',(e,d)=>controllerMethods.handleOnClick(d.original));
      bpEnter.merge(bpSel).attr('cx',d=>d.jitterX).attr('cy',d=>d.py).style('fill','#4A90E2').style('opacity',this.defaultOpacity).style('stroke','none');
      bpSel.exit().remove();

      // points: bathrooms
      const bathPoints = data.filter(d=>+d.bathrooms===c).map(d=>({original:d, py:y(+d.price)}));
  bathPoints.forEach(p=>{ const ix=d3.bisectLeft(ySamples, +p.original.price); const densVal=(dBath[ix]&&dBath[ix][1])||0; const maxJ=densityScale(densVal); p.jitterX = centerRight + (Math.random()*2 -1) * Math.max(1, maxJ*0.9); });
      const bapSel = this.rowsGroup.selectAll(`.point-bath-${c}`).data(bathPoints, d=>d.original.index);
      const bapEnter = bapSel.enter().append('circle').attr('class', `vpoint point-bath`).attr('r',3).on('click',(e,d)=>controllerMethods.handleOnClick(d.original));
      bapEnter.merge(bapSel).attr('cx',d=>d.jitterX).attr('cy',d=>d.py).style('fill','#F5A623').style('opacity',this.defaultOpacity).style('stroke','none');
      bapSel.exit().remove();

      // x label with count (show total houses for either bed or bath count)
      const cntTotal = data.filter(d=>+d.bedrooms===c || +d.bathrooms===c).length;
      const tickSel = this.rowsGroup.selectAll(`.count-tick-${c}`).data([c]);
      const tickEnter = tickSel.enter().append('text').attr('class',`count-tick-${c}`);
      tickEnter.merge(tickSel).attr('x', bandStart + xBand.bandwidth()/2).attr('y', this.height + 14).text(`${c} (${cntTotal})`).attr('text-anchor','middle');
      tickSel.exit().remove();
    });

  // debug overlay removed: previously used to visualize drag ranges during development.

    // done drawing violins and points

  // y axis (price) is shared with the scatterplot; do not draw it here
  this.svg.selectAll('.yAxis').remove();

  // store current data and controllerMethods for brush handlers
  this.currentData = data;
  this.currentControllerMethods = controllerMethods;
  // ensure brush extent matches current size (in case resize happened)
  if (this.brush) {
    this.brush.extent([[0,0],[this.width,this.height]]);
    if (this.brushG) this.brushG.call(this.brush);
  }
  }

  highlightSelected = function(selectedItems) {
    const selSet = new Set((selectedItems||[]).map(s=>s.index));
    // dim non-selected points; highlight selected
    this.rowsGroup.selectAll('.vpoint')
      .style('opacity', d => selSet.size===0 ? this.defaultOpacity : (selSet.has(d.original.index) ? 1 : 0.12))
      .style('stroke', d => selSet.has(d.original.index) ? '#333' : 'none')
      .style('stroke-width', d => selSet.has(d.original.index) ? 1.2 : 0);
    // optionally emphasize violins that contain selected items
    // also dim violins that do not contain any selected items
    const selStatuses = new Set((selectedItems||[]).map(s=>s.furnishingstatus));
    this.rowsGroup.selectAll('.violin')
      .style('opacity', d => {
        if (selSet.size===0) return 0.9;
        return selStatuses.has(d) ? 0.95 : 0.25;
      });
  }

  clear = function(){ d3.select(this.el).selectAll('*').remove(); }
}

export default StackedCountsD3;
