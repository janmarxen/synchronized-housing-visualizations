import './StackedCounts.css'
import { useEffect, useRef } from 'react';
import StackedCountsD3 from './StackedCounts-d3';

function StackedCountsContainer({data, scatterplotControllerMethods, selectedItems}){
    const divRef = useRef(null);
    const d3Ref = useRef(null);

    useEffect(()=>{
        const counts = new StackedCountsD3(divRef.current);
        counts.create({size:{width: divRef.current.offsetWidth, height: divRef.current.offsetHeight}});
        d3Ref.current = counts;
        return ()=>{counts.clear()}
    },[])

    useEffect(()=>{
        if(d3Ref.current && data && data.length>0){
            d3Ref.current.render(data,{
                handleOnClick: (d)=> scatterplotControllerMethods.updateSelectedItems([d]),
                handleOnBrush: (items)=> scatterplotControllerMethods.updateSelectedItems(items)
            })
        }
    },[data]);

    useEffect(()=>{
        if(d3Ref.current){
            d3Ref.current.highlightSelected(selectedItems);
        }
    },[selectedItems])

    return (
        <div ref={divRef} className="stackedCountsDivContainer col2"></div>
    )
}

export default StackedCountsContainer;
