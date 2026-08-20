/* eslint-disable no-unused-vars */
import "./index.scss";
import React, { useState, useEffect } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { SlMenu } from "react-icons/sl";
import { VscChromeClose } from "react-icons/vsc";
import { useNavigate, useLocation } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import ContentWrapper from "../content-wrapper";
import logo from "../../assets/main-logo.png";

const Header = () => {
	const [show, setShow] = useState("top");
	const [lastScrollY, setLastScrollY] = useState(0);
	const [mobileMenu, setMobileMenu] = useState(false);
	const [query, setQuery] = useState("");
	const [showSearch, setShowSearch] = useState("");
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		window.scrollTo(0, 0);
	}, [location]);

	const handleNavbar = () => {
		if (window.scrollY > 200) {
			if (window.scrollY > lastScrollY && !mobileMenu) {
				setShow("hide");
			} else {
				setShow("show");
			}
		} else {
			setShow("top");
		}
		setLastScrollY(window.scrollY);
	};

	useEffect(() => {
		window.addEventListener("scroll", handleNavbar);
		return () => {
			window.removeEventListener("scroll", handleNavbar);
		};
	}, [lastScrollY]);

	const searchQuery = (e) => {
		if (e.key === "Enter" && query.length > 0) {
			navigate(`search/${query}`);
		}
		setTimeout(() => {
			setShowSearch(false);
		}, 3000);
	};

	const openSearch = () => {
		setShowSearch(true);
		setMobileMenu(false);
	};

	const openMobileMenu = () => {
		setShowSearch(false);
		setMobileMenu(true);
	};

	const handleNavigation = (navigationType) => {
		if (navigationType === "movies") {
			navigate("/explore/movie");
		} else if (navigationType === "tvShows") {
			navigate("/explore/tv");
		} else if (navigationType === "settings") {
			navigate("/settings");
		}
		setMobileMenu(false);
	};

	return (
		<header className={`header ${mobileMenu ? "mobileView" : ""} ${show}`}>
			<ContentWrapper>
				<div className="logo" onClick={() => navigate("/")}>
					<img src="/logo.svg" alt="BubbaFlix" />
				</div>

				<ul className="menuItems">
					<li
						className="menuItem"
						onClick={() => handleNavigation("movies")}
					>
						Movies
					</li>
					<li
						className="menuItem"
						onClick={() => handleNavigation("tvShows")}
					>
						TV Shows
					</li>
					<li
						className="menuItem"
						onClick={() => handleNavigation("settings")}
						title="Settings"
					>
						<FiSettings />
					</li>
					<li className="menuItem">
						<HiOutlineSearch
							style={{ cursor: "pointer" }}
							onClick={openSearch}
						/>
					</li>
				</ul>

				<div className="mobileMenuItems">
					<HiOutlineSearch
						style={{ cursor: "pointer" }}
						onClick={openSearch}
					/>
					{mobileMenu ? (
						<VscChromeClose onClick={() => setMobileMenu(false)} />
					) : (
						<SlMenu
							style={{ cursor: "pointer" }}
							onClick={openMobileMenu}
						/>
					)}
				</div>
			</ContentWrapper>

			{showSearch && (
				<div className="searchBar">
					<ContentWrapper>
						<div className="searchInput">
							<input
								type="text"
								placeholder="Search for movies or tv shows.."
								onChange={(e) => setQuery(e.target.value)}
								onKeyUp={searchQuery}
							/>
							<VscChromeClose
								onClick={() => setShowSearch(false)}
							/>
						</div>
					</ContentWrapper>
				</div>
			)}
		</header>
	);
};

export default Header;
