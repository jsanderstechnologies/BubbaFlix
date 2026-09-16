import re

with open('f:/Cyberflix/src/pages/home-page/hero-banner/index.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_insert = '''import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";'''
content = content.replace('''import { useState, useEffect } from "react";''', import_insert)

bg_insert = '''const HeroBanner = () => {
	const { user } = useContext(AuthContext);
	const disableBg = (localStorage.getItem("disable_backgrounds") !== null ? JSON.parse(localStorage.getItem("disable_backgrounds")) : null) ?? user?.preferences?.disableBackgrounds ?? false;'''
content = content.replace('''const HeroBanner = () => {''', bg_insert)

jsx_insert = '''			{!loading && !disableBg && (
				<div className="backdrop-img">
					<Img src={backgroundImg} />
				</div>
			)}'''
content = content.replace('''			{!loading && (
				<div className="backdrop-img">
					<Img src={backgroundImg} />
				</div>
			)}''', jsx_insert)

with open('f:/Cyberflix/src/pages/home-page/hero-banner/index.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched hero banner")
