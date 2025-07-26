"use client";

import React from "react";
import { motion, useAnimation } from "framer-motion";

const pathVariants = {
  normal: {
    pathLength: 1,
    pathOffset: 0,
    opacity: 1,
  },
  animate: {
    pathLength: [0, 1],
    pathOffset: [1, 0],
    opacity: [0.3, 1],
    transition: {
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  },
};

const Activity = ({
  width = 28,
  height = 28,
  strokeWidth = 2,
  stroke = "white",
  ...props
}) => {
  const controls = useAnimation();

  // Start animation immediately when component mounts
  React.useEffect(() => {
    controls.start("animate");
  }, [controls]);

  return (
    <div
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <motion.path
          d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
          variants={pathVariants}
          animate={controls}
          initial="normal"
        />
      </svg>
    </div>
  );
};

export { Activity }; 