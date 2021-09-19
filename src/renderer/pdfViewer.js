import ReactDOM from "react-dom";
import React, { Component } from "react";
import PropTypes from "prop-types";
import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/webpack";
import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import "pdfjs-dist/web/pdf_viewer.css";
import "./pdf.css";

class Viewer extends Component {
  constructor(props) {
    super(props);
    this.initEventBus();
    this.state = {
      doc: null,
      scale: undefined,
    };
  }
  initEventBus() {
    let eventBus = new PDFJSViewer.EventBus();
    eventBus.on("pagesinit", (e) => {
      this.setState({
        scale: this._pdfViewer.currentScale,
      });
      if (this.props.onInit) {
        this.props.onInit({});
      }
      if (this.props.onScaleChanged) {
        this.props.onScaleChanged({ scale: this.state.scale });
      }
    });
    eventBus.on("scalechange", (e) => {
      if (this.props.onScaleChanged) {
        this.props.onScaleChanged({ scale: e.scale });
      }
    });
    this._eventBus = eventBus;
  }
  componentDidMount() {
    let viewerContainer = ReactDOM.findDOMNode(this);
    this._pdfViewer = new PDFJSViewer.PDFViewer({
      container: viewerContainer,
      eventBus: this._eventBus,
    });
  }
  UNSAFE_componentWillUpdate(nextProps, nextState) {
    if (this.state.doc !== nextState.doc) {
      this._pdfViewer.setDocument(nextState.doc);
    }
    if (this.state.scale !== nextState.scale) {
      this._pdfViewer.currentScale = nextState.scale;
    }
  }
  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.doc !== nextState.doc || this.state.scale !== nextState.scale) {
      return true;
    }
    return false;
  }
  render() {
    return (
      <div className="Viewer">
        <div className="pdfViewer"></div>
      </div>
    );
  }
}

Viewer.propTypes = {
  onInit: PropTypes.func,
  onScaleChanged: PropTypes.func,
};

class Toolbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scale: 0,
    };
  }
  zoomIn(e) {
    if (this.props.onZoomIn) {
      this.props.onZoomIn(e);
    }
  }
  zoomOut(e) {
    if (this.props.onZoomOut) {
      this.props.onZoomOut(e);
    }
  }
  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.scale !== nextState.scale) {
      return true;
    }
    return false;
  }
  render() {
    return (
      <div className="Toolbar">
        <button className="ZoomIn" onClick={(e) => this.zoomOut(e)}>
          -
        </button>
        <button className="ZoomOut" onClick={(e) => this.zoomIn(e)}>
          +
        </button>
        <div className="ZoomPercent">{(this.state.scale * 100).toFixed(1)}%</div>
      </div>
    );
  }
}

Toolbar.propTypes = {
  onZoomIn: PropTypes.func,
  onZoomOut: PropTypes.func,
};

export default class PdfViewer extends Component {
  componentDidMount() {
    let loadingTask = pdfjsLib.getDocument(fs.readFileSync(this.props.url).buffer);
    loadingTask.promise.then(
      (doc) => {
        console.log(`Document ${this.props.url} loaded ${doc.numPages} page(s)`);
        this.viewer.setState({
          doc,
        });
      },
      (reason) => {
        console.error(`Error during ${this.props.url} loading: ${reason}`);
      }
    );
  }
  zoomIn(e) {
    this.viewer.setState({
      scale: this.viewer.state.scale * 1.1,
    });
  }
  zoomOut(e) {
    this.viewer.setState({
      scale: this.viewer.state.scale / 1.1,
    });
  }
  displayScaleChanged(e) {
    this.toolbar.setState({
      scale: e.scale,
    });
  }
  render() {
    return (
      <div className="PdfViewer">
        <Toolbar
          ref={(ref) => (this.toolbar = ref)}
          onZoomIn={(e) => this.zoomIn(e)}
          onZoomOut={(e) => this.zoomOut(e)}
        ></Toolbar>
        <div className="PdfViewer-body">
          <Viewer
            ref={(ref) => (this.viewer = ref)}
            onScaleChanged={(e) => this.displayScaleChanged(e)}
          ></Viewer>
        </div>
      </div>
    );
  }
}

PdfViewer.propTypes = {
  url: PropTypes.string,
};
