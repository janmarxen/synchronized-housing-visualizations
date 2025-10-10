import './Matrix.css'
import {useEffect, useRef} from "react";
import MatrixD3 from "./Matrix-d3";

function Matrix({matrixData}){
    console.log("Matrix component function call")

    // do not write any behaviour here except hook function declarations or function/constant initialization
    const divContainerRef = useRef(null);
    const getCharSize = function(){
        // getting size from parent item
        let width;
        let height;
        if(divContainerRef.current!==undefined){
            width=divContainerRef.current.offsetWidth;
            height=divContainerRef.current.offsetHeight;
        }
        return {width:width,height:height};
    }

    const matrixD3Ref = useRef(null);
    useEffect(() => {
        // do something when the component did mount
        console.log("Matrix useEffect with dependency [], called each time the component did mount...");
        const matrixD3Vis = new MatrixD3(divContainerRef.current);
        matrixD3Vis.create({size:getCharSize()});
        matrixD3Ref.current = matrixD3Vis;
        return ()=>{
            // do something when the component did unmout (removed for the screen)
            console.log("Matrix useEffect return function, called each time the component did unmount...");
            const matrixD3Vis = matrixD3Ref.current;
            matrixD3Vis.clear();
        };
    }, []);

    useEffect(()=>{
        console.log("Matrix useEffect with dependency [matrixData], called each time matrixData changes...");
        const matrixD3Vis = matrixD3Ref.current;

        matrixD3Vis.renderMatrix(matrixData);
    },[matrixData]);// if dependencies, useEffect is called after each data update, in our case only matrixData changes.

    return(
        <div ref={divContainerRef} className="matrixDivContainer col2">
        </div>
    )
}

export default Matrix;
