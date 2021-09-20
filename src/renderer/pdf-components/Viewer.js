import ReactDOM from "react-dom";
import React, { Component } from "react";
import SteinPDFViewer from "./SteinPDFViewer";

import "pdfjs-dist/web/pdf_viewer.css";
import "@/css/pdf.css";

export default class Viewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scale: undefined,
    };
  }
  componentDidMount() {
    this._pdfViewer = new SteinPDFViewer(this.props.url, ReactDOM.findDOMNode(this));
    window._pdf = this._pdfViewer;
    this._eventBus = this._pdfViewer._eventBus;
    this._eventBus.on("pagesinit", (e) => {
      this.setState({ scale: this._pdfViewer.currentScale });
      if (this.props.onInit) {
        this.props.onInit({});
      }
      if (this.props.onScaleChanged) {
        this.props.onScaleChanged({ scale: this.state.scale });
      }
    });
    this._eventBus.on("scalechange", (e) => {
      if (this.props.onScaleChanged) {
        this.props.onScaleChanged({ scale: e.scale });
      }
    });
  }
  render() {
    return (
      <div id="Viewer">
        <div id="pdfViewer"></div>
      </div>
    );
  }
}
