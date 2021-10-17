import React, { Component } from "react";
import { ResizeGrip } from "@/components/ResizablePanel";
import { stubArray } from "lodash";

function outlineToBreadcrumb(outline, pageIdx) {
  const breadcrumb = [];
  let current = outline;
  breadcrumb.push(current?.title);
  while (current?.children.length > 0) {
    current = current.children
      .filter((child) => child.pageIdx <= pageIdx)
      .sort((a, b) => b.pageIdx - a.pageIdx)[0];
    breadcrumb.push(current.title);
  }
  return breadcrumb;
}

class CurrentPath extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentPath: [],
    };
    this.handleScroll = _.debounce(this.handleScroll.bind(this), 100, {
      leading: false,
      trailing: true,
    });
    window._pdf._eventBus.on("pagechanging", this.handleScroll);
  }
  handleScroll() {
    const outlineRoot = window.HighlightManager.docProxy.listSerializableOutlines();
    const pageIdx = window._pdf._pdfViewer.currentPageNumber - 1;
    this.setState({
      currentPath: outlineToBreadcrumb(outlineRoot?.[0], pageIdx),
    });
  }
  render() {
    return (
      <div className="toolbar-item current-path">
        {this.state.currentPath.map((title, idx) => (
          <span className="breadcrumb-item" key={idx}>
            {" "}
            <span className="breadcrumb-title">{title}</span>
            <span className="breadcrumb-separator">/</span>
          </span>
        ))}
      </div>
    );
  }
}

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

class HighlightLevelToggle extends Component {
  constructor(props) {
    super(props);
    this.state = {
      level: 1,
    };
    this.toggleLevel = this.toggleLevel.bind(this);
  }
  toggleLevel() {
    this.setState({
      level: this.state.level === 1 ? 3 : 1,
    });
  }
  render() {
    return (
      <div className="toolbar-item">
        <style>
          {`
          #Toolbar .toolbar-item button.highlight-level-toggle {
            font-size: 10px;
            font-weight: light;
            width: fit-content;
          }
          #Viewer .highlight-layer {
            z-index: ${this.state.level};
          }
        `}
        </style>
        <button onClick={this.toggleLevel} className="highlight-level-toggle">
          {this.state.level === 1 ? "overlight" : "backlight"}
        </button>
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
          <CurrentPath />
        </div>
        <div id="toolbar-mid">
          <ZoomControls />
          <HighlightLevelToggle />
        </div>
        <div id="toolbar-right">
          <PageNumberControls />
        </div>

        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
