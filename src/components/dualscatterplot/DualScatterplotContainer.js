import './DualScatterplot.css'
import { useEffect, useRef } from 'react';
import DualScatterplotD3 from './DualScatterplot-d3';

function DualScatterplotContainer({data, xAttribute1, xAttribute2, yAttribute, scatterplotControllerMethods, selectedItems}) {

    // Log re-renders
    useEffect(() => {
        console.log("DualScatterplotContainer useEffect (called each time component re-renders)");
    });

    const divContainerRef = useRef(null);
    const dualScatterplotD3Ref = useRef(null);

    // Get yDomain and showYAxis from props
    const { yDomain, showYAxis } = arguments[0];

    // Update highlights when selectedItems change
    useEffect(() => {
        if (!dualScatterplotD3Ref.current) return;
        dualScatterplotD3Ref.current.highlightSelected && dualScatterplotD3Ref.current.highlightSelected(selectedItems);
    }, [selectedItems]);

    const getCharSize = function(){
        let width;
        let height;
        if (divContainerRef.current !== undefined && divContainerRef.current !== null) {
            width = divContainerRef.current.offsetWidth;
            height = divContainerRef.current.offsetHeight - 4;
        }
        console.log("DualScatterplot getCharSize:", {width, height});
        return {width: width, height: height};
    }

    // Component mount: create D3 chart
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        console.log("DualScatterplotContainer useEffect [] called once the component did mount");
        const dualScatterplotD3 = new DualScatterplotD3(divContainerRef.current);
        dualScatterplotD3.create({size: getCharSize(), yDomain, showYAxis});
        dualScatterplotD3Ref.current = dualScatterplotD3;
        
        return () => {
            console.log("DualScatterplotContainer useEffect [] return function, called when the component did unmount...");
            const dualScatterplotD3 = dualScatterplotD3Ref.current;
            dualScatterplotD3.clear();
        }
    }, []);

    // Update chart when data or attributes change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const handleOnClick = function(cellData){
            console.log("handleOnClick ...");
            scatterplotControllerMethods.updateSelectedItems([cellData]);
        }
        
        const handleOnBrush = function(selectedData){
            console.log("handleOnBrush ...", selectedData);
            scatterplotControllerMethods.updateSelectedItems(selectedData);
        }
        
        const handleOnMouseEnter = function(itemData){};
        const handleOnMouseLeave = function(){};

        const controllerMethods = {
            handleOnClick,
            handleOnBrush,
            handleOnMouseEnter,
            handleOnMouseLeave
        };

        const dualScatterplotD3 = dualScatterplotD3Ref.current;
        if (dualScatterplotD3 && data && data.length > 0) {
            dualScatterplotD3.renderDualScatterplot(data, xAttribute1, xAttribute2, yAttribute, controllerMethods, yDomain, showYAxis);
        }
    }, [data, xAttribute1, xAttribute2, yAttribute]);

    return (
        <div ref={divContainerRef} className="dualScatterplotDivContainer col2">
            <div id="" className="row">

            </div>
        </div>
    )
}

export default DualScatterplotContainer;
