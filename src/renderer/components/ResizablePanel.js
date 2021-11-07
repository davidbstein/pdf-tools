import React, { Profiler, useState } from "react";

/**
 * a grippable div that sends movement updates when click-dragged
 * @param {*} props
 */
export function ResizeGrip(props) {
  const onMouseDown = (e) => {
    const fn = (e) => {
      if (e) props.resize(e);
    };
    window.addEventListener("mousemove", fn);
    window.addEventListener("mouseup", () => {
      window.removeEventListener("mousemove", fn);
    });
  };

  const click = (e) => {
    if (props.hide) props.hide();
  }

  return (
    <div className="resize-grip" onMouseDown={onMouseDown} onClick={click}>
      {props.children}
    </div>
  );
}
