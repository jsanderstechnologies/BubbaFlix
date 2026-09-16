import re

with open('f:/Cyberflix/src/pages/details-page/details-banner/index.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_insert = '''import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";'''
content = content.replace('''import { useState } from "react";''', import_insert)

bg_insert = '''const DetailsBanner = ({ video, crew, setIsTrailerActive }) => {
	const { user } = useContext(AuthContext);
	const disableBg = (localStorage.getItem("disable_backgrounds") !== null ? JSON.parse(localStorage.getItem("disable_backgrounds")) : null) ?? user?.preferences?.disableBackgrounds ?? false;'''
content = content.replace('''const DetailsBanner = ({ video, crew, setIsTrailerActive }) => {''', bg_insert)

jsx_insert = '''					{!!data && !disableBg && (
						<div className="backdrop-img">
							<Img src={(url?.backdrop || "https://image.tmdb.org/t/p/original") + data?.backdrop_path} />
						</div>
					)}'''
content = content.replace('''					{!!data && (
						<div className="backdrop-img">
							<Img src={(url?.backdrop || "https://image.tmdb.org/t/p/original") + data?.backdrop_path} />
						</div>
					)}''', jsx_insert)

with open('f:/Cyberflix/src/pages/details-page/details-banner/index.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched details banner")
