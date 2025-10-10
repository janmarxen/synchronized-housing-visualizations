import "./ControlBar.css"


function ControlBar({genConfigData, onSubmitGenAction}){

    const handleOnSubmit = function(event){
        // Prevent the browser from reloading the page
        event.preventDefault();

        // get the form data and transform it in JSON format
        const form = event.target;
        const formData = new FormData(form);
        const formJSON = Object.fromEntries(formData.entries());
        onSubmitGenAction(formJSON)
    }

    return (
        <form onSubmit={handleOnSubmit}>
            <label>
                Nb rows
                <input name="nbRows" type="number" defaultValue = "4"/>
            </label>

            <label>
                Nb columns
                <input name="nbCols" type="number" defaultValue = "4"/>
            </label>
            <button type="submit">Generate</button><br/>
            NbRows: {genConfigData.nbRows} NbCols: {genConfigData.nbCols}
        </form>
    );
}
export default ControlBar;