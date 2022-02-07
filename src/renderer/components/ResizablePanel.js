import React, { Profiler, useState } from "react";

/**
 * a grippable div that sends movement updates when click-dragged
 * @param {*} props
 */
export function ResizeGrip(props) {
  const [dragging, setDragging] = useState(false);
  const [lastStart, setLastStart] = useState(0);
  const [lastEnd, setLastEnd] = useState(0);

  const onMouseDown = (e) => {
    const fn = (e) => {
      if (e) props.resize(e);
    };
    window.addEventListener("mousemove", fn);
    setLastStart(Date.now());
    window.addEventListener("mouseup", () => {
      window.removeEventListener("mousemove", fn);
      setDragging(false);
      setLastEnd(Date.now());
    });
    setDragging(true);
  };

  const click = (e) => {
    const now = Date.now();
    console.log(now - lastStart, now - lastEnd);
    if (props.hide && now - lastStart < 100 && lastEnd - lastStart < 100) props.hide();
  };

  return (
    <div className="resize-grip" onMouseDown={onMouseDown} onClick={click}>
      {props.children}
    </div>
  );
}
