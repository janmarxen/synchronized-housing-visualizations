import './ViolinScatter.css'
import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import ViolinScatterD3 from './ViolinScatter-d3';

function ViolinScatterContainer({data, scatterplotControllerMethods, selectedItems, yDomain, variables}){
    const divRef = useRef(null);
    const d3Ref = useRef(null);

    // normalize variables to array of objects with colors for legend and pass-through
    const variableObjects = useMemo(()=>{
        const names = Array.isArray(variables) && variables.length>0 ? variables : ['bedrooms','stories','bathrooms'];
        // use d3.schemeTableau10 for nice distinct colors; fallback to interpolate
        const palette = d3.schemeTableau10 || d3.schemeCategory10;
        return names.map((n,i)=>{
            const color = palette[i % palette.length] || d3.interpolateRainbow(i / Math.max(1,names.length));
            return { name: typeof n === 'string' ? n : n.name, label: (n && n.label) ? n.label : (typeof n === 'string' ? n : n.name), fill: color, stroke: d3.color(color).darker(0.6).formatHex(), pointFill: d3.color(color).darker(1).formatHex() };
        });
    },[variables]);

    useEffect(()=>{
        console.debug('ViolinScatterContainer: creating d3 instance');
        const counts = new ViolinScatterD3(divRef.current);
        const computeSize = ()=>{
            const width = divRef.current.scrollWidth || divRef.current.offsetWidth;
            const height = divRef.current.offsetHeight || 400;
            counts.create({size:{width, height}, yDomain, variables: variableObjects});
        };
        computeSize();
        const onResize = () => computeSize();
        window.addEventListener('resize', onResize);
        d3Ref.current = counts;
        return ()=>{ window.removeEventListener('resize', onResize); counts.clear(); }
    },[yDomain, variableObjects])

    useEffect(()=>{
        if(d3Ref.current && data && data.length>0){
            const currentWidth = divRef.current.scrollWidth || divRef.current.offsetWidth;
            const currentHeight = divRef.current.offsetHeight || 400;
            const currentSize = d3Ref.current.size || {};
            if (!currentSize.width || !currentSize.height || currentSize.width !== currentWidth || currentSize.height !== currentHeight) {
                console.debug('ViolinScatterContainer: recreating d3 due to size change', {currentSize, currentWidth, currentHeight});
                d3Ref.current.create({size:{width: currentWidth, height: currentHeight}, yDomain, variables: variableObjects});
            }
            console.debug('ViolinScatterContainer: calling render on d3');
            d3Ref.current.render(data,{ yDomain, variables: variableObjects,
                handleOnClick: (d)=> scatterplotControllerMethods.updateSelectedItems([d]),
                handleOnBrush: (items)=> scatterplotControllerMethods.updateSelectedItems(items)
            });
        }
    },[data, yDomain, variableObjects, scatterplotControllerMethods]);

    useEffect(()=>{
        if(d3Ref.current){
            d3Ref.current.highlightSelected(selectedItems);
        }
    },[selectedItems])

    return (
        <div className="stackedCountsWrapper col2">
            <div className="stackedCountsLegend">
                {variableObjects.map(v=> (
                    <div key={v.name} className="legend-item"><span className="legend-swatch" style={{background:v.fill,borderColor:v.stroke}}></span> {v.label}</div>
                ))}
                <div style={{marginLeft:'auto'}}>
                    <button onClick={()=>{
                        if (d3Ref.current && d3Ref.current.clearAllBrushes) d3Ref.current.clearAllBrushes();
                        try{ scatterplotControllerMethods.updateSelectedItems([]); }catch(e){}
                    }}>Clear selections</button>
                </div>
            </div>
            <div className="stackedCountsScroll">
                <div ref={divRef} className="stackedCountsDivContainer"></div>
            </div>
        </div>
    )
}

export default ViolinScatterContainer;
