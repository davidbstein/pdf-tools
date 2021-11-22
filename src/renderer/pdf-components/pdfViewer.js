import Viewer from "@/pdf-components/Viewer";
import Toolbar from "@/pdf-components/Toolbar";
import Sidebar from "@/pdf-components/sidebar/Sidebar";
import Statusbar from "@/pdf-components/Statusbar";
import Annotationbar from "@/pdf-components/Annotationbar";
import PDFAnnotationEditor from "@/annotation/PDFAnnotationEditorController";
import _ from "lodash";

import React, { Component } from "react";
import "pdfjs-dist/web/pdf_viewer.css";
import "@/css/pdf.scss";
import { getCurrentPath } from "../actions";
import { emitEvent, Logger } from "../helpers";

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
      activeHighlights: [],
      pane_size_annotationbar: 150,
      firstPageIdx: 0,
      highlightRenderLayer: 1,
      lastPageIdx: 0,
      outlinePath: [],
      outlineRoots: [],
      page_idx: 0,
      pageNumber: 1,
      pdf_ready: false,
      scale: 1,
      pane_size_sidebar: 200,
      pane_size_statusbar: 22,
      pane_size_toolbar: 32,
    };
    this.resizeSidebar = this.resizeSidebar.bind(this);
    this.resizeToolbar = this.resizeToolbar.bind(this);
    this.resizeStatusbar = this.resizeStatusbar.bind(this);
    this.resizeAnnotationbar = this.resizeAnnotationbar.bind(this);
    this.readyForPDFCallback = this.readyForPDFCallback.bind(this);
    this.fixResize = _.debounce(this.fixResize.bind(this), 100, { trailing: true, leading: false });
    // this.fixResize = this.fixResize.bind(this);
  }
  fixResize(firstPageIdx) {
    emitEvent("app-viewer-resize");
    emitEvent("app-set-page", firstPageIdx);
  }
  resizeSidebar(newWidth) {
    this.setState({ pane_size_sidebar: Math.max(0, newWidth) });
    this.fixResize(this.state.firstPageIdx);
  }
  resizeToolbar(newHeight) {
    this.setState({ pane_size_toolbar: Math.max(0, newHeight) });
    this.fixResize(this.state.firstPageIdx);
  }
  resizeStatusbar(newHeight) {
    this.setState({ pane_size_statusbar: Math.max(0, newHeight) });
    this.fixResize(this.state.firstPageIdx);
  }
  resizeAnnotationbar(newWidth) {
    this.setState({ pane_size_annotationbar: Math.max(0, newWidth) });
    this.fixResize(this.state.firstPageIdx);
  }
  readyForPDFCallback(target) {
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
      activeHighlights,
      current_zoom,
      firstPageIdx,
      highlightRenderLayer,
      lastPageIdx,
      outline,
      outlinePath,
      outlineRoots,
      pageNumber,
      scale,
    } = this.state;
    return (
      <div className="PdfViewer">
        <style>
          {`
          :root {
            --toolbar-height: ${this.state.pane_size_toolbar}px;
            --sidebar-width: ${outlineRoots.length > 0 ? this.state.pane_size_sidebar : 20}px;
            --statusbar-height: ${this.state.pane_size_statusbar}px;
            --annotationbar-width: ${this.state.pane_size_annotationbar}px;
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
              outlineRoots={outlineRoots}
            />
            <Statusbar resize={this.resizeStatusbar} />
            <Annotationbar resize={this.resizeAnnotationbar} />
          </div>
        ) : (
          <LoadingScreen />
        )}
        <Viewer url={this.props.url} readyForPDF={this.readyForPDFCallback} />
      </div>
    );
  }
}
