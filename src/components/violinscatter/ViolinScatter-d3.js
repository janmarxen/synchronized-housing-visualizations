    import * as d3 from 'd3'

class ViolinScatterD3 {
  margin = { top: 20, right: 16, bottom: 40, left: 120 };
  size;
  width;
  height;
  svg;
  defaultOpacity = 0.85;

  constructor(el) { this.el = el }

  create = function(config) {
    try {
      d3.select(this.el).selectAll('*').remove();
    } catch (e) {
      console.error('ViolinScatterD3.create: failed to clear el', e);
    }
    this.size = { width: config.size.width, height: config.size.height };
    try { console.debug('ViolinScatterD3.create config:', config, 'el:', this.el && this.el.tagName); } catch(e){}
    if (!this.size.width) this.size.width = 800;
    if (!this.size.height) this.size.height = 400;
    this.width = this.size.width - this.margin.left - this.margin.right;
    this.height = this.size.height - this.margin.top - this.margin.bottom;

    const ml = Number(this.margin && this.margin.left) || 0;
    const mr = Number(this.margin && this.margin.right) || 0;
    const mt = Number(this.margin && this.margin.top) || 0;
    const mb = Number(this.margin && this.margin.bottom) || 0;
    try { console.debug('ViolinScatterD3.create computed sizes:', {ml,mr,mt,mb, width:this.width, height:this.height}); } catch(e){}
    const svgWidth = Number(this.width) + ml + mr;
    const svgHeight = Number(this.height) + mt + mb;
    try {
      this.svg = d3.select(this.el).append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
        .attr('transform', `translate(${ml},${mt})`);
    } catch (e) {
      console.error('ViolinScatterD3.create: failed to create svg/g transform', {svgWidth, svgHeight, ml, mt, e});
      try {
        this.svg = d3.select(this.el).append('svg').attr('width', svgWidth).attr('height', svgHeight).append('g');
      } catch (e2) { console.error('ViolinScatterD3.create fallback failed', e2); }
    }

    this.rowsGroup = this.svg.append('g').attr('class','rows-group');
  // group for vertical separators between categories
  this.sepGroup = this.svg.append('g').attr('class','sep-group');
  this.svg.append('g').attr('class','xAxis').attr('transform', `translate(0,${isFinite(this.height)?this.height:0})`);

    d3.select(this.el).style('position','relative');
    d3.select(this.el).selectAll('.brush-tooltip').remove();
    this.tooltip = d3.select(this.el).append('div').attr('class','brush-tooltip').style('display','none');

    this.multiBrushes = [];
    this._creating = false;
    this._currentRect = null;

    const svgElem = d3.select(this.el).select('svg');
    svgElem.on('mousedown.multiRect', (event) => {
      if (event.button !== 0) return;
      const [mx,my] = d3.pointer(event, this.svg.node());
      this._creating = true;
      this._createStart = [mx,my];
      this._currentRect = this.svg.append('rect')
        .attr('class','multi-brush')
        .attr('x', mx).attr('y', my).attr('width', 0).attr('height', 0)
        .style('fill','rgba(74,144,226,0.12)')
        .style('stroke','#1f6fbf')
        .style('stroke-width',1.2)
        .style('pointer-events','all');
    });
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
          this._currentRect.remove();
        } else {
          const bbox = {x, y, x2: x + w, y2: y + h};
          this.multiBrushes.push({rect: this._currentRect, bbox});
          this._currentRect.style('pointer-events','none');
          this.updateBrushesSelection();
        }
        this._currentRect = null;
      }
    });
  }

  _onBrushStart = function(event){
    if (this.tooltip) this.tooltip.style('display','block');
  }

  _onBrush = function(event){
    if (!this.currentData || !this.currentControllerMethods || !this.y) return;
    if (event.selection){
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
      try { if (this.currentControllerMethods) this.currentControllerMethods.handleOnBrush([]); } catch(e){}
      if (this.tooltip) this.tooltip.style('display','none');
    }
  }

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

  const prices = data.map(d => +d.price).filter(v => !isNaN(v));
  if (prices.length === 0) return;
  const domainFromController = (controllerMethods && controllerMethods.yDomain) ? controllerMethods.yDomain : null;
  const yDomain = domainFromController && domainFromController.length===2 ? domainFromController : [d3.min(prices), d3.max(prices)];
  const y = d3.scaleLinear().domain(yDomain).nice().range([this.height, 0]);
  this.y = y;

  const unionCounts = [1,2,3,4,5];
  // reduce padding between bands so each category occupies more horizontal space
  const xBand = d3.scaleBand().domain(unionCounts).range([0, this.width]).padding(0.06);

    const ySamples = d3.range(y.domain()[0], y.domain()[1], (y.domain()[1]-y.domain()[0]) / 80);
    const kde = this.kernelDensityEstimator(this.kernelEpanechnikov((y.domain()[1]-y.domain()[0]) / 40), ySamples);

    const densitiesBed = {};
    const densitiesBath = {};
    const densitiesStories = {};
    let globalMax = 0;
    unionCounts.forEach(c => {
      const bedVals = data.filter(d => +d.bedrooms === c).map(d=>+d.price).filter(v=>!isNaN(v));
      const bathVals = data.filter(d => +d.bathrooms === c).map(d=>+d.price).filter(v=>!isNaN(v));
      const storyVals = data.filter(d => +d.stories === c).map(d=>+d.price).filter(v=>!isNaN(v));
      const dBed = bedVals.length>0 ? kde(bedVals) : ySamples.map(s=>[s,0]);
      const dBath = bathVals.length>0 ? kde(bathVals) : ySamples.map(s=>[s,0]);
      const dStories = storyVals.length>0 ? kde(storyVals) : ySamples.map(s=>[s,0]);
      densitiesBed[c] = dBed;
      densitiesBath[c] = dBath;
      densitiesStories[c] = dStories;
      const m1 = d3.max(dBed, d=>d[1])||0;
      const m2 = d3.max(dBath, d=>d[1])||0;
      const m3 = d3.max(dStories, d=>d[1])||0;
      globalMax = Math.max(globalMax, m1, m2, m3);
    });

  const halfBand = xBand.bandwidth() / 2;
  const violinMaxHalfWidth = Math.max(12, halfBand * 0.72);
    const densityScale = d3.scaleLinear().domain([0, globalMax||1]).range([0, violinMaxHalfWidth]);
  this.rowsGroup.selectAll('*').remove();
  // draw vertical separators between bands for clearer grouping
  const separators = unionCounts.slice(0,-1).map((c,i)=>{
    const next = unionCounts[i+1];
    const pos = (xBand(c) + xBand(next)) / 2 + xBand.bandwidth() / 2;
    return {x: pos};
  });
  const sepSel = this.sepGroup.selectAll('.sep-line').data(separators);
  const sepEnter = sepSel.enter().append('line').attr('class','sep-line');
  sepEnter.merge(sepSel).attr('x1',d=>d.x).attr('x2',d=>d.x).attr('y1',0).attr('y2',this.height).style('stroke','#ccc').style('stroke-dasharray','4 4').style('opacity',0.7);
  sepSel.exit().remove();
  unionCounts.forEach(c => {
      const bandStart = xBand(c);
      // three centers across the band for bedrooms, stories, bathrooms
      const centerLeft = bandStart + xBand.bandwidth() * 0.17; // bedrooms
      const centerMid = bandStart + xBand.bandwidth() * 0.5;   // stories
      const centerRight = bandStart + xBand.bandwidth() * 0.83; // bathrooms
      const dBed = densitiesBed[c];
      const dBath = densitiesBath[c];
      const dStories = densitiesStories[c];

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

      // stories violin (middle)
      const areaStories = d3.area()
        .curve(d3.curveBasis)
        .y(d => y(d[0]))
        .x0(d => centerMid - densityScale(d[1]))
        .x1(d => centerMid + densityScale(d[1]));
      const vs = this.rowsGroup.selectAll(`.violin-story-${c}`).data([dStories]);
      const vsEnter = vs.enter().append('path').attr('class', `violin violin-story-${c}`);
      vsEnter.merge(vs)
        .attr('d', areaStories)
        .style('fill', '#f3e8ff')
        .style('stroke', '#b889ff')
        .style('opacity', 0.5);
      vs.exit().remove();

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

      // points: stories (middle)
      const storiesPoints = data.filter(d=>+d.stories===c).map(d=>({original:d, py:y(+d.price)}));
      storiesPoints.forEach(p=>{ const ix=d3.bisectLeft(ySamples, +p.original.price); const densVal=(dStories[ix]&&dStories[ix][1])||0; const maxJ=densityScale(densVal); p.jitterX = centerMid + (Math.random()*2 -1) * Math.max(1, maxJ*0.9); });
      const spSel = this.rowsGroup.selectAll(`.point-story-${c}`).data(storiesPoints, d=>d.original.index);
      const spEnter = spSel.enter().append('circle').attr('class', `vpoint point-story`).attr('r',3).on('click',(e,d)=>controllerMethods.handleOnClick(d.original));
      spEnter.merge(spSel).attr('cx',d=>d.jitterX).attr('cy',d=>d.py).style('fill','#9b59b6').style('opacity',this.defaultOpacity).style('stroke','none');
      spSel.exit().remove();

      // points: bathrooms
      const bathPoints = data.filter(d=>+d.bathrooms===c).map(d=>({original:d, py:y(+d.price)}));
      bathPoints.forEach(p=>{ const ix=d3.bisectLeft(ySamples, +p.original.price); const densVal=(dBath[ix]&&dBath[ix][1])||0; const maxJ=densityScale(densVal); p.jitterX = centerRight + (Math.random()*2 -1) * Math.max(1, maxJ*0.9); });
      const bapSel = this.rowsGroup.selectAll(`.point-bath-${c}`).data(bathPoints, d=>d.original.index);
      const bapEnter = bapSel.enter().append('circle').attr('class', `vpoint point-bath`).attr('r',3).on('click',(e,d)=>controllerMethods.handleOnClick(d.original));
      bapEnter.merge(bapSel).attr('cx',d=>d.jitterX).attr('cy',d=>d.py).style('fill','#F5A623').style('opacity',this.defaultOpacity).style('stroke','none');
      bapSel.exit().remove();

  const tickSel = this.rowsGroup.selectAll(`.count-tick-${c}`).data([c]);
  const tickEnter = tickSel.enter().append('text').attr('class',`count-tick-${c}`);
  // show only the x axis value (no counts in parentheses)
  tickEnter.merge(tickSel).attr('x', bandStart + xBand.bandwidth()/2).attr('y', this.height + 14).text(`${c}`).attr('text-anchor','middle');
      tickSel.exit().remove();
    });

  this.svg.selectAll('.yAxis').remove();

  this.currentData = data;
  this.currentControllerMethods = controllerMethods;
  if (this.brush) {
    this.brush.extent([[0,0],[this.width,this.height]]);
    if (this.brushG) this.brushG.call(this.brush);
  }
  }

  highlightSelected = function(selectedItems) {
    const selSet = new Set((selectedItems||[]).map(s=>s.index));
    this.rowsGroup.selectAll('.vpoint')
      .style('opacity', d => selSet.size===0 ? this.defaultOpacity : (selSet.has(d.original.index) ? 1 : 0.12))
      .style('stroke', d => selSet.has(d.original.index) ? '#333' : 'none')
      .style('stroke-width', d => selSet.has(d.original.index) ? 1.2 : 0);
    const selStatuses = new Set((selectedItems||[]).map(s=>s.furnishingstatus));
    this.rowsGroup.selectAll('.violin')
      .style('opacity', d => {
        if (selSet.size===0) return 0.9;
        return selStatuses.has(d) ? 0.95 : 0.25;
      });
  }

  clear = function(){ d3.select(this.el).selectAll('*').remove(); }
}

export default ViolinScatterD3;
