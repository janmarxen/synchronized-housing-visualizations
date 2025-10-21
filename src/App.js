import './App.css';
import {useState, useEffect} from 'react'
import {fetchCSV} from "./utils/helper";
import ScatterplotContainer from "./components/scatterplot/ScatterplotContainer";
import DualScatterplotContainer from "./components/dualscatterplot/DualScatterplotContainer";

function App() {
    console.log("App component function call...")
    const [data,setData] = useState([])
    // every time the component re-render
    useEffect(()=>{
        console.log("App useEffect (called each time App re-renders)");
    }); // if no dependencies, useEffect is called at each re-render

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


    const [selectedItems, setSelectedItems] = useState([])
    const scatterplotControllerMethods = {
        updateSelectedItems: (items) =>{
        setSelectedItems(items);
        }
    };

    // Compute y-axis domain for price
    let yDomain = [0, 1];
    if (data && data.length > 0) {
        const prices = data.map(d => +d.price).filter(v => !isNaN(v));
        yDomain = [Math.min(...prices), Math.max(...prices)];
    }

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
                <DualScatterplotContainer
                    data={data}
                    xAttribute1="bedrooms"
                    xAttribute2="bathrooms"
                    yAttribute="price"
                    yDomain={yDomain}
                    showYAxis={false}
                    scatterplotControllerMethods={scatterplotControllerMethods}
                    selectedItems={selectedItems}
                />
            </div>
        </div>
    );
}

export default App;
