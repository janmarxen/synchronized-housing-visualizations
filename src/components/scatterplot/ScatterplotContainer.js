import './Scatterplot.css'
import { useEffect, useRef } from 'react';

import ScatterplotD3 from './Scatterplot-d3';

// TODO: import action methods from reducers

function ScatterplotContainer({scatterplotData, xAttribute, yAttribute, scatterplotControllerMethods, selectedItems}) {

    // every time the component re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(()=>{
        console.log("ScatterplotContainer useEffect (called each time scatterplot re-renders)");
    }); // if no dependencies, useEffect is called at each re-render

    const divContainerRef=useRef(null);
    const scatterplotD3Ref = useRef(null);

    // Accept yDomain and showYAxis from props
    // eslint-disable-next-line
    const { yDomain, showYAxis } = arguments[0];

    // updates when selectedItems change
    useEffect(()=>{
        if (!scatterplotD3Ref.current) return;
        // Call a method on the D3 scatterplot to highlight selected items
        scatterplotD3Ref.current.highlightSelected && scatterplotD3Ref.current.highlightSelected(selectedItems);
    }, [selectedItems]);

    const getCharSize = function(){
        // getting size from parent item
        let width;// = 800;
        let height;// = 100;
        if(divContainerRef.current!==undefined){
            width=divContainerRef.current.offsetWidth;
            height=divContainerRef.current.offsetHeight-4;
        }
        return {width:width,height:height};
    }

    // did mount called once the component did mount
    useEffect(()=>{
        console.log("ScatterplotContainer useEffect [] called once the component did mount");
    const scatterplotD3 = new ScatterplotD3(divContainerRef.current);
    scatterplotD3.create({size:getCharSize(), yDomain, showYAxis});
    scatterplotD3Ref.current = scatterplotD3;
        return ()=>{
            // did unmout, the return function is called once the component did unmount (removed for the screen)
            console.log("ScatterplotContainer useEffect [] return function, called when the component did unmount...");
            const scatterplotD3 = scatterplotD3Ref.current;
            scatterplotD3.clear()
        }
    },[]);// if empty array, useEffect is called after the component did mount (has been created)

    // Only update chart when data or axes change, NOT when selectedItems changes
    useEffect(()=>{

        const handleOnClick = function(cellData){
            console.log("handleOnClick ...")
            scatterplotControllerMethods.updateSelectedItems([cellData])
        }
        const handleOnBrush = function(selectedData){
            console.log("handleOnBrush ...", selectedData);
            scatterplotControllerMethods.updateSelectedItems(selectedData);
        }
        const handleOnMouseEnter = function(itemData){};
        const handleOnMouseLeave = function(){};

        const controllerMethods={
            handleOnClick,
            handleOnBrush,
            handleOnMouseEnter,
            handleOnMouseLeave
        };

        // get the current instance of scatterplotD3 from the Ref...
        const scatterplotD3 = scatterplotD3Ref.current;
        if (scatterplotD3 && scatterplotData && scatterplotData.length > 0) {
            scatterplotD3.renderScatterplot(scatterplotData, xAttribute, yAttribute, controllerMethods, yDomain, showYAxis);
        }
    },[scatterplotData, xAttribute, yAttribute]);

    return(
        <div ref={divContainerRef} className="scatterplotDivContainer col2">
            <div id="" className="row">

            </div>
        </div>
    )
}

export default ScatterplotContainer;