import Viewer from "@/pdf-components/Viewer";
import Toolbar from "@/pdf-components/Toolbar";
import Sidebar from "@/pdf-components/Sidebar";
import Statusbar from "@/pdf-components/Statusbar";
import React, { Component } from "react";
import "pdfjs-dist/web/pdf_viewer.css";
import "@/css/pdf.css";

export default class PdfViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scale: 0,
    };
  }
  displayScaleChanged(e) {
    this.setState({
      scale: e.scale,
    });
  }
  render() {
    return (
      <div className="PdfViewer">
        <Toolbar scale={this.state.scale} />
        <Sidebar />
        <Statusbar />
        <Viewer url={this.props.url} onScaleChanged={(e) => this.displayScaleChanged(e)} />
      </div>
    );
  }
}
