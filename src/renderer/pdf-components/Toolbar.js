import React, { Component } from "react";
import { ResizeGrip } from "@/components/ResizablePanel";

class PageNumberControls extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pageNumber: props.pageNumber,
      pageCount: window._pdf._pdfViewer.pagesCount,
    };
    window._pdf._eventBus.on("pagechanging", this.handlePageChange.bind(this));
    this.up = this.up.bind(this);
    this.down = this.down.bind(this);
    this.changePageNumber = this.changePageNumber.bind(this);
  }
  handlePageChange({ pageLabel, pageNumber, previous }) {
    this.setState({
      pageNumber,
    });
  }
  changePageNumber(e) {
    const pageNumber = parseInt(e.target.value);
    window._pdf._pdfViewer.currentPageNumber = pageNumber;
  }
  up() {}
  down() {}
  render() {
    const { pageNumber, pageCount } = this.state;
    return (
      <div className="toolbar-item page-number-view">
        <div className="button-panel">
          <button onClick={this.down} className="page-down">
            ↑
          </button>
          <button onClick={this.up} className="page-up">
            ↓
          </button>
        </div>
        <div className="page-number">
          <input type="number" value={pageNumber} onChange={this.changePageNumber} />
          <span>/</span>
          <span className="page-count"> {pageCount}</span>
        </div>
      </div>
    );
  }
}

class ZoomControls extends Component {
  constructor(props) {
    super(props);
    this.state = {
      zoom: 1,
    };
    window._pdf._eventBus.on("scalechanging", this.handleZoomChange.bind(this));
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
  }
  handleZoomChange({ source, scale, presentValue }) {
    console.log(scale);
    this.setState({ zoom: scale });
  }
  zoomIn() {
    window._pdf._pdfViewer._setScale(this.state.zoom + 0.1);
  }
  zoomOut() {
    window._pdf._pdfViewer._setScale(this.state.zoom - 0.1);
  }
  render() {
    const { zoom } = this.state;
    return (
      <div className="toolbar-item">
        <button onClick={this.zoomOut} className="zoom-out">
          -
        </button>
        <button onClick={this.zoomIn} className="zoom-in">
          +
        </button>
        <div className="zoom-level">{Math.floor(100 * zoom)}%</div>
      </div>
    );
  }
}

export default class Toolbar extends Component {
  constructor(props) {
    super(props);
    this.resize = this.resize.bind(this);
  }
  resize(e) {
    this.props.resize(e.y);
  }
  render() {
    return (
      <div id="Toolbar">
        <div id="toolbar-left">
          <PageNumberControls />
        </div>
        <div id="toolbar-mid">
          <ZoomControls />
        </div>
        <div id="toolbar-right"> </div>

        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
