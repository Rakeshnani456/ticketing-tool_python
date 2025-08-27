"use client";

import React from "react";
import { motion, useAnimation } from "framer-motion";

const bellVariants = {
  normal: { rotate: 0 },
  animate: {
    rotate: [-10, 10, -10],
    transition: {
      duration: 0.5,
      repeat: 2,
      repeatType: "reverse",
    },
  },
};

const ringVariants = {
  normal: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const BellRing = ({
  width = 28,
  height = 28,
  strokeWidth = 2,
  stroke = "#ffffff",
  unreadCount = 0,
  animateBell = false,
  onClick,
  ...props
}) => {
  const controls = useAnimation();

  React.useEffect(() => {
    if (animateBell) {
      controls.start("animate");
    } else {
      controls.start("normal");
    }
  }, [animateBell, controls]);

  return (
    <div
      style={{
        cursor: "pointer",
        userSelect: "none",
        padding: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
      }}
      onClick={onClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="white"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <motion.path
          d="M10.268 21a2 2 0 0 0 3.464 0"
          variants={bellVariants}
          animate={controls}
          initial="normal"
        />
        <motion.g variants={ringVariants} animate={controls} initial="normal">
          <path d="M22 8c0-2.3-.8-4.3-2-6" />
          <path d="M4 2C2.8 3.7 2 5.7 2 8" />
        </motion.g>
        <motion.path
          d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
          variants={bellVariants}
          animate={controls}
          initial="normal"
        />
      </svg>
      {unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            minWidth: 14,
            height: 14,
            background: "#ef4444",
            color: "#fff",
            borderRadius: "999px",
            fontSize: 9,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3px",
            boxShadow: "0 0 0 1px #fff",
            lineHeight: 1
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </div>
  );
};

export { BellRing }; 