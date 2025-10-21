import * as d3 from 'd3'

class StackedCountsD3 {
  margin = { top: 20, right: 20, bottom: 30, left: 40 };
  size;
  width;
  height;
  svg;
  defaultOpacity = 0.8;

  constructor(el) { this.el = el }

  create = function(config) {
    this.size = { width: config.size.width, height: config.size.height };
    if (!this.size.width || !this.size.height) return;
    this.width = this.size.width - this.margin.left - this.margin.right;
    this.height = this.size.height - this.margin.top - this.margin.bottom;

    this.svg = d3.select(this.el).append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // create two subgroups stacked vertically
    this.topGroup = this.svg.append('g').attr('class','count-bedrooms');
    this.bottomGroup = this.svg.append('g').attr('class','count-bathrooms')
      .attr('transform', `translate(0,${this.height/2})`);

    // axes holders
    this.svg.append('g').attr('class','xAxisTop').attr('transform', `translate(0,${this.height/2})`);
    this.svg.append('g').attr('class','xAxisBottom').attr('transform', `translate(0,${this.height})`);
  }

  render = function(data, controllerMethods) {
    if (!this.svg) return;

    // compute counts per integer value
    const beds = d3.rollup(data, v => v.length, d => +d.bedrooms);
    const baths = d3.rollup(data, v => v.length, d => +d.bathrooms);

    const allVals = Array.from(new Set([...beds.keys(), ...baths.keys()])).sort((a,b)=>a-b);
    const x = d3.scaleBand().domain(allVals).range([0,this.width]).padding(0.2);

    const maxCount = Math.max(...Array.from(beds.values()), ...Array.from(baths.values()));
    const y = d3.scaleLinear().domain([0,maxCount]).range([this.height/2,0]);

    // top: bedrooms bars
    const topData = allVals.map(v=>({val:v,count: beds.get(v) || 0}));
    const topSel = this.topGroup.selectAll('.bar-bed').data(topData, d=>d.val);
    topSel.enter().append('rect').attr('class','bar-bed')
      .attr('x', d=> x(d.val))
      .attr('y', d=> y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d=> (this.height/2 - y(d.count)))
      .style('fill','#4A90E2')
      .on('click',(event,d)=> controllerMethods.handleOnClick({type:'bedrooms',val:d.val}));

    // bottom: bathrooms bars
    const bottomData = allVals.map(v=>({val:v,count: baths.get(v) || 0}));
    const bottomSel = this.bottomGroup.selectAll('.bar-bath').data(bottomData, d=>d.val);
    bottomSel.enter().append('rect').attr('class','bar-bath')
      .attr('x', d=> x(d.val))
      .attr('y', d=> y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d=> (this.height/2 - y(d.count)))
      .style('fill','#F5A623')
      .on('click',(event,d)=> controllerMethods.handleOnClick({type:'bathrooms',val:d.val}));

    // axes
    const xAxis = d3.axisBottom(x).tickFormat(d3.format('d'));
    this.svg.select('.xAxisTop').call(xAxis);
    this.svg.select('.xAxisBottom').call(xAxis);

    // brushing for selection: user can brush horizontally to select integer bins
    this.svg.selectAll('.brush').remove();
    const brush = d3.brushX()
      .extent([[0,0],[this.width,this.height]])
      .on('brush end', (event)=>{
        if (event.selection){
          const [x0,x1] = event.selection;
          // compute selected vals
          const selectedVals = allVals.filter(v => {
            const cx = x(v) + x.bandwidth()/2;
            return cx >= x0 && cx <= x1;
          });
          // collect houses matching either bedrooms or bathrooms selected bins
          const selected = data.filter(d => selectedVals.includes(+d.bedrooms) || selectedVals.includes(+d.bathrooms));
          // dedupe
          const unique = Array.from(new Map(selected.map(s=>[s.index,s])).values());
          controllerMethods.handleOnBrush(unique);
        } else {
          controllerMethods.handleOnBrush([]);
        }
      });
    this.svg.append('g').attr('class','brush').call(brush);
  }

  highlightSelected = function(selectedItems) {
    const selectedSet = new Set((selectedItems||[]).map(s=>s.index));
    // highlight bars that correspond to selected houses
    // compute counts per bin of selected items
    // we will set higher opacity for bars that contain selected items
    // (for simplicity we won't animate counts)
  }

  clear = function(){ d3.select(this.el).selectAll('*').remove(); }
}

export default StackedCountsD3;
