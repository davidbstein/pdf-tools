import Viewer from "@/pdf-components/Viewer";
import Toolbar from "@/pdf-components/Toolbar";
import Sidebar from "@/pdf-components/sidebar/Sidebar";
import Statusbar from "@/pdf-components/Statusbar";
import Annotationbar from "@/pdf-components/Annotationbar";
import PDFAnnotationEditor from "@/annotation/PDFAnnotationEditorController";

import React, { Component } from "react";
import "pdfjs-dist/web/pdf_viewer.css";
import "@/css/pdf.scss";
import { getCurrentPath } from "../actions";
import { Logger } from "../helpers";

class LoadingScreen extends Component {
  render() {
    return (
      <div className="loading-screen">
        <div className="loading-screen-content">
          <div className="loading-screen-spinner" />
          <div className="loading-screen-text">Loading...</div>
        </div>
      </div>
    );
  }
}

export default class PdfViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scale: 1,
      toolbar_height: 32,
      sidebar_width: 200,
      statusbar_height: 22,
      annotationbar_width: 150,
      pdf_ready: false,
      pageNumber: 1,
      page_idx: 0,
      outlinePath: [],
      firstPageIdx: 0,
      lastPageIdx: 0,
      highlightRenderLayer: 1,
      activeHighlights: [],
    };
    this.resizeSidebar = this.resizeSidebar.bind(this);
    this.resizeToolbar = this.resizeToolbar.bind(this);
    this.resizeStatusbar = this.resizeStatusbar.bind(this);
    this.resizeAnnotationbar = this.resizeAnnotationbar.bind(this);
    this.readyForPDF = this.readyForPDF.bind(this);
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
    this.pdfEditor = window._pdf || new PDFAnnotationEditor(this.props.url, target, this);
    this.pdfEditor.pdfjsEventBus.on("pagesinit", (e) => {
      this.setState({ pdf_ready: true });
      if (this.props.onInit) {
        this.props.onInit({});
      }
    });
  }
  render() {
    const {
      firstPageIdx,
      lastPageIdx,
      pageNumber,
      outlinePath,
      highlightRenderLayer,
      outline,
      current_zoom,
      scale,
      activeHighlights,
    } = this.state;
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
          ` +
            activeHighlights
              .map((refNumber) => `.annotation-ref-${refNumber} {box-shadow: 0 0 1px 0px;}`)
              .join("\n")}
        </style>
        {this.state.pdf_ready ? (
          <div>
            <Toolbar
              resize={this.resizeToolbar}
              pageNumber={pageNumber}
              firstPageIdx={firstPageIdx}
              lastPageIdx={lastPageIdx}
              path={outlinePath}
              scale={scale}
              highlightRenderLayer={highlightRenderLayer}
            />
            <Sidebar
              resize={this.resizeSidebar}
              firstPageIdx={firstPageIdx}
              lastPageIdx={lastPageIdx}
              outlinePath={outlinePath}
            />
            <Statusbar resize={this.resizeStatusbar} />
            <Annotationbar resize={this.resizeAnnotationbar} />
          </div>
        ) : (
          <LoadingScreen />
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
