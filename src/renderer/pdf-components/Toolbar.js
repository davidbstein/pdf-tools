import React, { Component } from "react";
import { ResizeGrip } from "@/components/ResizablePanel";
import { stubArray } from "lodash";
import { emitEvent, Logger } from "@/helpers";

const logger = new Logger("Toolbar");

class CurrentPath extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div className="toolbar-item current-path">
        {this.props.path.map((title, idx) => (
          <span className="breadcrumb-item" key={idx}>
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
      pageCount: window._pdf.pdfViewer.pagesCount,
    };
    this.up = this.up.bind(this);
    this.down = this.down.bind(this);
    this.changePageNumber = this.changePageNumber.bind(this);
  }
  changePageNumber(e) {
    const pageNumber = parseInt(e.target.value);
    window._pdf.pdfViewer.currentPageNumber = pageNumber;
  }
  up() {}
  down() {}
  render() {
    const { pageCount } = this.state;
    const { firstPageIdx, lastPageIdx } = this.props;
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
          <span>
            (
            <input
              style={{ width: `${Math.max(1, Math.ceil(Math.log10(firstPageIdx)) / 2)}em` }}
              type="number"
              value={firstPageIdx}
              onChange={this.changePageNumber}
            />
            -{lastPageIdx})/{pageCount}
          </span>
        </div>
      </div>
    );
  }
}

class ZoomControls extends Component {
  constructor(props) {
    super(props);
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
  }
  zoomIn() {
    emitEvent("app-set-zoom", this.props.scale + 0.1);
  }
  zoomOut() {
    emitEvent("app-set-zoom", this.props.scale - 0.1);
  }
  render() {
    const { scale } = this.props;
    return (
      <div className="toolbar-item">
        <button onClick={this.zoomOut} className="zoom-out">
          -
        </button>
        <button onClick={this.zoomIn} className="zoom-in">
          +
        </button>
        <div className="zoom-level">{Math.floor(100 * scale)}%</div>
      </div>
    );
  }
}

class HighlightLevelToggle extends Component {
  constructor(props) {
    super(props);
    this.toggleLevel = this.toggleLevel.bind(this);
  }
  toggleLevel() {
    logger.log(this.props);
    emitEvent("app-set-highlight-render-layer", {
      highlightRenderLayer: this.props.highlightRenderLayer === 1 ? 3 : 1,
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
            z-index: ${this.props.highlightRenderLayer};
          }
        `}
        </style>
        <button onClick={this.toggleLevel} className="highlight-level-toggle">
          {this.props.highlightRenderLayer === 1 ? "overlight" : "backlight"}
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
          <CurrentPath path={this.props.path} />
        </div>
        <div id="toolbar-mid">
          <ZoomControls scale={this.props.scale} />
          <HighlightLevelToggle highlightRenderLayer={this.props.highlightRenderLayer} />
        </div>
        <div id="toolbar-right">
          <PageNumberControls
            firstPageIdx={this.props.firstPageIdx}
            lastPageIdx={this.props.lastPageIdx}
          />
        </div>

        <ResizeGrip resize={this.resize} />
      </div>
    );
  }
}
