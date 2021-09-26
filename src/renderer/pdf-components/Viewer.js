import ReactDOM from "react-dom";
import React, { Component } from "react";
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
    this.props.readyForPDF(ReactDOM.findDOMNode(this));
  }
  render() {
    return (
      <div id="Viewer">
        <div id="pdfViewer"></div>
      </div>
    );
  }
}
