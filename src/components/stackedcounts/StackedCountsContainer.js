import './StackedCounts.css'
import { useEffect, useRef } from 'react';
import StackedCountsD3 from './StackedCounts-d3';

function StackedCountsContainer({data, scatterplotControllerMethods, selectedItems, yDomain}){
    const divRef = useRef(null);
    const d3Ref = useRef(null);

    useEffect(()=>{
        console.debug('StackedCountsContainer: creating d3 instance');
        const counts = new StackedCountsD3(divRef.current);
        const computeSize = ()=>{
            // prefer scrollWidth (min-width may make inner wider than viewport)
            const width = divRef.current.scrollWidth || divRef.current.offsetWidth;
            const height = divRef.current.offsetHeight || 400;
            counts.create({size:{width, height}, yDomain});
        };
        computeSize();
        // update on window resize
        const onResize = () => computeSize();
        window.addEventListener('resize', onResize);
        d3Ref.current = counts;
        return ()=>{ window.removeEventListener('resize', onResize); counts.clear(); }
    },[yDomain])

    useEffect(()=>{
        if(d3Ref.current && data && data.length>0){
            // recompute width in case the inner min-width changed (scrollable)
            const currentWidth = divRef.current.scrollWidth || divRef.current.offsetWidth;
            const currentHeight = divRef.current.offsetHeight || 400;
            // Only recreate the D3 container if the size actually changed; recreating clears handlers
            const currentSize = d3Ref.current.size || {};
            if (!currentSize.width || !currentSize.height || currentSize.width !== currentWidth || currentSize.height !== currentHeight) {
                console.debug('StackedCountsContainer: recreating d3 due to size change', {currentSize, currentWidth, currentHeight});
                d3Ref.current.create({size:{width: currentWidth, height: currentHeight}, yDomain});
            }
            console.debug('StackedCountsContainer: calling render on d3');
            d3Ref.current.render(data,{ yDomain,
                handleOnClick: (d)=> scatterplotControllerMethods.updateSelectedItems([d]),
                handleOnBrush: (items)=> scatterplotControllerMethods.updateSelectedItems(items)
            });
        }
    },[data, yDomain]);

    useEffect(()=>{
        if(d3Ref.current){
            d3Ref.current.highlightSelected(selectedItems);
        }
    },[selectedItems])

    return (
        <div className="stackedCountsWrapper col2">
            <div className="stackedCountsLegend">
                <div className="legend-item"><span className="legend-swatch swatch-bed"></span> Bedrooms</div>
                <div className="legend-item"><span className="legend-swatch swatch-bath"></span> Bathrooms</div>
                <div style={{marginLeft:'auto'}}>
                    <button onClick={()=>{
                        // clear D3 manual brushes and clear controller selection
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

export default StackedCountsContainer;
