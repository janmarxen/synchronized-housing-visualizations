import * as d3 from 'd3'
import { getDefaultFontSize } from '../../utils/helper';

class MatrixD3{
    margin = {top: 100, right: 5, bottom: 5, left: 100};
    marginLabelsToMatrix=5;
    size;
    height;
    width;
    matSvg;
    cellSize= 34;
    radiusMin = 2;
    radiusMax = this.cellSize / 2;

    fontSize = getDefaultFontSize();
    transitionDuration = 2000;

    colorScheme = d3.schemeRdYlBu[11];
    cellColorScale = d3.scaleQuantile(this.colorScheme);
    cellSizeScale = d3.scaleLinear()
        .range([this.radiusMin, this.radiusMax-1])
    ;


    // the constructor takes the element to add the SVG within it
    constructor(el){
        this.el=el;
    };

    create (config) {
        this.size = {width: config.size.width, height: config.size.height};

        // get the effect size of the view by subtracting the margin
        this.width = this.size.width - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top - this.margin.bottom;

        // initialize the svg and keep it in a class property to reuse it in renderMatrix()
        this.matSvg = d3.select(this.el).append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("class","matSvgG")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
        ;


    }

    updateCellHighlighting(cellsToUpdate){
        this.matSvg.selectAll(".cellG")
            .data(cellsToUpdate, cellData=>cellData.index)
            // no need to call join() because we don't need enter or exit
            // update selection is already returned by data()
            .select(".CellCircle")
            .attr("stroke-width",cellData=>{
                return cellData.selected?2:0
            });
        ;
    }

    updateCells(selection){
        selection.transition()
            .duration(this.transitionDuration)
            .attr("transform",(cellData)=>{
            return "translate("+(cellData.colPos*this.cellSize)+","+(cellData.rowPos*this.cellSize)+")"
        });
        selection.select(".CellCircle")
            .transition()
            .duration(this.transitionDuration)
            .attr("r",(cellData)=>this.cellSizeScale(cellData.nbProductSold))
            .attr("fill",(cellData) =>{
                const color = this.cellColorScale(cellData.salesGrowth);
                return color;
            })
            .attr("stroke-width",(cellData)=>{
                return cellData.selected?2:0;
            })
        ;
    }

    renderLabelsInMargin(matrixData){
        // getting row labels and column labels
        const rowLabels = [];
        const colLabels = [];
        matrixData.forEach((cellData)=>{
            rowLabels[cellData.rowPos] = {label: cellData.rowLabel, id: cellData.rowPos};
            colLabels[cellData.colPos] = {label: cellData.colLabel, id: cellData.colPos};
        });

        this.matSvg.selectAll(".rowLabelsG")
            .data(rowLabels,(rowLabel)=>{return rowLabel.id})
            .join(
                enter=>{
                    enter.append("g")
                        .attr("class","rowLabelsG")
                        .attr("transform", (cellData)=>{
                            const gPos = (cellData.id*this.cellSize) + this.cellSize/2-1 + getDefaultFontSize()/2
                            return "translate(0,"+gPos+")"
                        })
                        .append("text")
                        .text(rowLabel=>{return rowLabel.label})
                        .attr("text-anchor","end")
                },
                update=>{},
                exit=>{
                    exit.remove()
                }
            )
        ;
        this.matSvg.selectAll(".colLabelsG")
            .data(colLabels,(colLabel)=>{return colLabel.id})
            .join(
                enter=>{
                    enter.append("g")
                        .attr("class","colLabelsG")
                        .attr("transform", (cellData)=>{
                            const gPos = (cellData.id*this.cellSize) + this.cellSize/2-1 + getDefaultFontSize()/2
                            return "translate("+gPos+",0)"
                        })
                        .append("text")
                        .text(rowLabel=>{return rowLabel.label})
                        .attr("transform","rotate(-90)")
                },
                update=>{},
                exit=>{
                    exit.remove()
                }
            )
        ;
    }

    renderMatrix (matrixData){

        // build the color scale from the data
        this.cellColorScale.domain(matrixData.map(cellData=>cellData.salesGrowth));

        // build the size scale from the data
        const minNbProductSold = 0;
        // const minNbProductSold = d3.min(matrixData.genData.map(cellData=>cellData.nbProductSold));
        const maxNbProductSold = d3.max(matrixData.map(cellData=>cellData.nbProductSold));
        this.cellSizeScale.domain([minNbProductSold, maxNbProductSold])


        this.matSvg.selectAll(".cellG")
            // all elements with the class .cellG (empty the first time)
            .data(matrixData,(cellData)=>cellData.index)
            .join(
                enter=>{
                    // all data items to add:
                    // doesn’exist in the select but exist in the new array
                    const cellG=enter.append("g")
                        .attr("class","cellG")
                        .on("click", (event,cellData)=>{
                            console.log("cell on click")
                        })
                        .on("mouseenter",(event,cellData)=>{
                            console.log("cell on mouseenter")
                        })
                        .on("mouseleave",(event,cellData)=>{
                            console.log("cell on mouseleave")
                        })

                    ;
                    // render circle as child of each element "g"
                    cellG.append("circle")
                        .attr("class","CellCircle")
                        .attr("cx",this.radiusMax)
                        .attr("cy",this.radiusMax)
                        .attr("stroke","black")
                    ;
                    this.updateCells(cellG);
                },
                update=>{this.updateCells(update)},
                exit =>{
                    exit.transition()
                        .duration(this.transitionDuration)
                        .attr("transform", "translate("+this.width+","+this.height+")")
                        .remove()
                    ;
                }

            )
        this.renderLabelsInMargin(matrixData);
    }


    clear(){
        d3.select(this.el).selectAll("*").remove();
    }
}
export default MatrixD3;