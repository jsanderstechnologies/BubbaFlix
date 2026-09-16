import re

with open('f:/Cyberflix/src/components/background-rotator/index.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_insert = '''import { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "./index.scss";'''
content = content.replace('''import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./index.scss";''', import_insert)

bg_insert = '''const BackgroundRotator = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [activeIdx, setActiveIdx] = useState(0);

  const disableBg = (localStorage.getItem("disable_backgrounds") !== null ? JSON.parse(localStorage.getItem("disable_backgrounds")) : null) ?? user?.preferences?.disableBackgrounds ?? false;

  if (disableBg) {
    return <div className="backgroundRotatorStage" style={{ background: 'var(--black)' }} />;
  }'''
content = content.replace('''const BackgroundRotator = () => {
  const location = useLocation();
  const [activeIdx, setActiveIdx] = useState(0);''', bg_insert)

with open('f:/Cyberflix/src/components/background-rotator/index.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched rotator")
