import Viewer from "@/pdf-components/Viewer";
import Toolbar from "@/pdf-components/Toolbar";
import React, { Component } from "react";
import PropTypes from "prop-types";
import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/webpack";
import "pdfjs-dist/web/pdf_viewer.css";
import "@/css/pdf.css";

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
