# Project Structure and Component Overview

This project is a React-based data visualization application that uses D3.js for rendering interactive visualizations. Below is an overview of the structure and how the components work together.

---

## Project Structure

```
Tuto5-MultiDim/
│
├── public/
│   ├── index.html
│   └── data/
│       └── Housing.csv
│
├── src/
│   ├── App.js
│   ├── index.js
│   ├── App.css
│   ├── index.css
│   ├── components/
│   │   ├── controlbar/
│   │   │   ├── ControlBar.js
│   │   │   └── ControlBar.css
│   │   ├── matrix/
│   │   │   ├── Matrix.js
│   │   │   ├── Matrix-d3.js
│   │   │   └── Matrix.css
│   │   └── scatterplot/
│   │       ├── ScatterplotContainer.js
│   │       ├── Scatterplot-d3.js
│   │       └── Scatterplot.css
│   ├── templates/
│   │   └── d3react/
│   │       ├── Vis-d3.js
│   │       ├── VisContainer.js
│   │       └── Vis.css
│   └── utils/
│       └── helper.js
├── package.json
└── .gitignore
```

---

## How Components Work Together

### 1. **Entry Point**
- **public/index.html**: Contains the root `<div id="root"></div>` where the React app mounts.
- **src/index.js**: Bootstraps the React app and renders the `App` component into the root div.

### 2. **Main Application**
- **src/App.js**: 
  - Main React component.
  - Loads data (e.g., from `public/data/Housing.csv` using `fetchCSV`).
  - Maintains application state (e.g., loaded data).
  - Renders the main layout, including containers for visualizations.

### 3. **Data Loading Utilities**
- **src/utils/helper.js**:
  - Provides utility functions for fetching and parsing CSV/text data.
  - Used by `App.js` to load data asynchronously.

### 4. **Visualization Components**
#### a. **Matrix Visualization**
- **src/components/matrix/Matrix.js**: 
  - React component that acts as a container for the matrix visualization.
  - Uses a `ref` to attach a D3-rendered SVG.
  - Delegates rendering logic to `Matrix-d3.js`.
- **src/components/matrix/Matrix-d3.js**: 
  - D3 class for rendering and updating the matrix SVG visualization.
  - Handles drawing, updating, and clearing the SVG elements.
- **src/components/matrix/Matrix.css**: 
  - Styling for the matrix visualization.

#### b. **Scatterplot Visualization**
- **src/components/scatterplot/ScatterplotContainer.js**: 
  - React component that acts as a container for the scatterplot.
  - Uses a `ref` to attach a D3-rendered SVG.
  - Delegates rendering logic to `Scatterplot-d3.js`.
- **src/components/scatterplot/Scatterplot-d3.js**: 
  - D3 class for rendering and updating the scatterplot SVG visualization.
  - Handles drawing, updating, and clearing the SVG elements.
- **src/components/scatterplot/Scatterplot.css**: 
  - Styling for the scatterplot visualization.

#### c. **Reusable D3/React Template**
- **src/templates/d3react/VisContainer.js** and **Vis-d3.js**:
  - Provide a template for integrating D3 visualizations with React.
  - Can be used as a base for new visualizations.

### 5. **Control Bar**
- **src/components/controlbar/ControlBar.js**:
  - React component for user input (e.g., number of rows/columns).
  - Handles form submission and passes configuration changes up to the parent.
- **src/components/controlbar/ControlBar.css**:
  - Styling for the control bar.

---

## How It All Connects

1. **App Initialization**:  
   The app loads in `public/index.html`, and React mounts the `App` component.

2. **Data Loading**:  
   `App.js` uses `fetchCSV` to load data from `public/data/Housing.csv` and stores it in state.

3. **User Interaction**:  
   The user can interact with the `ControlBar` to change parameters (e.g., matrix size).

4. **Visualization Rendering**:  
   - The matrix and scatterplot containers receive data and configuration as props.
   - Each container uses a D3 class (`Matrix-d3.js`, `Scatterplot-d3.js`) to render and update the SVG visualizations inside their respective DOM nodes.

5. **Reusable Patterns**:  
   The `templates/d3react` folder provides a pattern for integrating D3 with React, which is followed by the matrix and scatterplot components.

---

**Summary:**  
The project is a modular, React-based data visualization tool that loads data, allows user configuration, and renders interactive D3 visualizations (matrix and scatterplot) in a reusable, maintainable way. Each visualization is split into a React container and a D3 rendering class for clear separation of concerns.
