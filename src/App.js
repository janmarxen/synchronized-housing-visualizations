import './App.css';
import {useState, useEffect, useCallback, useMemo} from 'react'
import {fetchCSV} from "./utils/helper";
import ScatterplotContainer from "./components/scatterplot/ScatterplotContainer";
import ViolinScatterContainer from "./components/violinscatter/ViolinScatterContainer";

function App() {
    console.log("App component function call...")
    const [data,setData] = useState([])
    // remove noisy per-render log

    useEffect(()=>{
        console.log("App did mount");
        fetchCSV("data/Housing.csv",(response)=>{
            console.log("initial setData() ...")
            setData(response.data);
        })
        return ()=>{
            console.log("App did unmount");
        }
    },[])


    // Track selections from each view separately
    const [leftSelection, setLeftSelection] = useState([])
    const [rightSelection, setRightSelection] = useState([])
    
    // Merge both selections (union by index)
    const selectedItems = useMemo(() => {
        const merged = new Map();
        leftSelection.forEach(item => merged.set(item.index, item));
        rightSelection.forEach(item => merged.set(item.index, item));
        return Array.from(merged.values());
    }, [leftSelection, rightSelection]);

    // Separate update methods for each view
    const updateLeftSelection = useCallback((items) => {
        setLeftSelection(items);
    }, []);
    
    const updateRightSelection = useCallback((items) => {
        setRightSelection(items);
    }, []);

    const scatterplotControllerMethods = useMemo(() => ({ 
        updateSelectedItems: updateLeftSelection 
    }), [updateLeftSelection]);
    
    const violinControllerMethods = useMemo(() => ({ 
        updateSelectedItems: updateRightSelection 
    }), [updateRightSelection]);

    // Compute y-axis domain for price (memoized so reference is stable)
    const yDomain = useMemo(()=>{
        if (!data || data.length === 0) return [0,1];
        const prices = data.map(d => +d.price).filter(v => !isNaN(v));
        return prices.length>0 ? [Math.min(...prices), Math.max(...prices)] : [0,1];
    },[data]);

    // variables to render as violins per x-category (can be changed to render n violins)
    const violinVariables = useMemo(()=>['bedrooms','stories','bathrooms'],[]);

    return (
        <div className="App">
            <div id={"MultiviewContainer"} className={"row"}>
                <ScatterplotContainer
                    scatterplotData={data}
                    xAttribute="area"
                    yAttribute="price"
                    yDomain={yDomain}
                    showYAxis={true}
                    scatterplotControllerMethods={scatterplotControllerMethods}
                    selectedItems={selectedItems}
                />
                <ViolinScatterContainer
                    data={data}
                    scatterplotControllerMethods={violinControllerMethods}
                    yDomain={yDomain}
                    selectedItems={selectedItems}
                    variables={violinVariables}
                />
            </div>
        </div>
    );
}

export default App;
