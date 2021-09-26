import Viewer from "@/pdf-components/Viewer";
import Toolbar from "@/pdf-components/Toolbar";
import Sidebar from "@/pdf-components/Sidebar";
import Statusbar from "@/pdf-components/Statusbar";
import Annotationbar from "@/pdf-components/Annotationbar";
import SteinPDFViewer from "@/pdf-components/SteinPDFViewer";

import React, { Component } from "react";
import "pdfjs-dist/web/pdf_viewer.css";
import "@/css/pdf.css";

export default class PdfViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scale: 0,
      toolbar_height: 44,
      sidebar_width: 200,
      statusbar_height: 22,
      annotationbar_width: 44,
      pdf_ready: false,
    };
    this.displayScaleChanged = this.displayScaleChanged.bind(this);
    this.resizeSidebar = this.resizeSidebar.bind(this);
    this.resizeToolbar = this.resizeToolbar.bind(this);
    this.resizeStatusbar = this.resizeStatusbar.bind(this);
    this.resizeAnnotationbar = this.resizeAnnotationbar.bind(this);
    this.readyForPDF = this.readyForPDF.bind(this);
  }
  displayScaleChanged(e) {
    this.setState({
      scale: e.scale,
    });
  }
  resizeSidebar(newWidth) {
    this.setState({ sidebar_width: newWidth });
  }
  resizeToolbar(newHeight) {
    this.setState({ toolbar_height: newHeight });
  }
  resizeStatusbar(newHeight) {
    this.setState({ statusbar_height: newHeight });
  }
  resizeAnnotationbar(newWidth) {
    this.setState({ annotationbar_width: newWidth });
  }
  readyForPDF(target) {
    if (window._pdf) {
      this._pdfViewer = window._pdf;
    }
    this._pdfViewer = new SteinPDFViewer(this.props.url, target);
    this._eventBus = this._pdfViewer._eventBus;
    this._eventBus.on("pagesinit", (e) => {
      this.setState({ scale: this._pdfViewer.currentScale });
      this.setState({ pdf_ready: true });
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
      <div className="PdfViewer">
        <style>
          {`
          :root {
            --toolbar-height: ${this.state.toolbar_height}px;
            --sidebar-width: ${this.state.sidebar_width}px;
            --statusbar-height: ${this.state.statusbar_height}px;
            --annotationbar-width: ${this.state.annotationbar_width}px;
          }
          `}
        </style>
        {this.state.pdf_ready ? (
          <div>
            <Toolbar scale={this.state.scale} resize={this.resizeToolbar} />
            <Sidebar resize={this.resizeSidebar} />
            <Statusbar resize={this.resizeStatusbar} />
            <Annotationbar resize={this.resizeAnnotationbar} />
          </div>
        ) : (
          []
        )}
        <Viewer
          url={this.props.url}
          onScaleChanged={(e) => this.displayScaleChanged(e)}
          readyForPDF={this.readyForPDF}
        />
      </div>
    );
  }
}
