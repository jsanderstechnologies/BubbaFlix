/* eslint-disable no-unused-vars */
import "./index.scss";
import React, { useState, useEffect } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { SlMenu } from "react-icons/sl";
import { VscChromeClose } from "react-icons/vsc";
import { useNavigate, useLocation } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import ContentWrapper from "../content-wrapper";

const Header = () => {
	const [show, setShow] = useState("top");
	const [mobileMenu, setMobileMenu] = useState(false);
	const [query, setQuery] = useState("");
	const [showSearch, setShowSearch] = useState(false);
	const [isReadOnly, setIsReadOnly] = useState(true);
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		window.scrollTo(0, 0);
	}, [location]);

	const searchQuery = (e) => {
		const code = e.keyCode;
		if ((e.key === "Enter" || code === 13 || code === 23 || code === 66) && query.trim().length > 0) {
			navigate(`search/${query.trim()}`);
			setShowSearch(false);
		}
	};

	const openSearch = () => {
		setShowSearch((prev) => !prev);
		setIsReadOnly(true);
		setMobileMenu(false);
		setShow("show");
	};

	const openMobileMenu = () => {
		setShowSearch(false);
		setMobileMenu((prev) => !prev);
		setShow("show");
	};

	const handleNavigation = (navigationType) => {
		if (navigationType === "home") {
			navigate("/");
		} else if (navigationType === "movies") {
			navigate("/explore/movie");
		} else if (navigationType === "tvShows") {
			navigate("/explore/tv");
		} else if (navigationType === "settings") {
			navigate("/settings");
		}
		setMobileMenu(false);
	};

	const handleKeyActivate = (e, callback) => {
		const code = e.keyCode;
		if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
			e.preventDefault();
			callback();
		}
	};

	return (
		<header
			className={`header ${mobileMenu ? "mobileView" : ""} ${show}`}
		>
			<ContentWrapper>
				<div
					className="logo"
					tabIndex="0"
					role="button"
					aria-label="BubbaFlix Home"
					onClick={() => handleNavigation("home")}
					onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("home"))}
				>
					<img src="/logo.svg" alt="BubbaFlix" />
				</div>

				<ul className="menuItems">
					<li
						className="menuItem"
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("movies")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("movies"))}
					>
						Movies
					</li>
					<li
						className="menuItem"
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("tvShows")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("tvShows"))}
					>
						TV Shows
					</li>
					<li
						className="menuItem"
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("settings")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("settings"))}
						title="Settings"
					>
						<FiSettings style={{ marginRight: 6 }} /> Settings
					</li>
					<li
						className="menuItem searchIcon"
						tabIndex="0"
						role="button"
						aria-label="Toggle Search"
						onClick={openSearch}
						onKeyDown={(e) => handleKeyActivate(e, openSearch)}
					>
						<HiOutlineSearch style={{ cursor: "pointer" }} />
					</li>
				</ul>

				<div className="mobileMenuItems">
					<button
						className="headerIconBtn"
						tabIndex="0"
						aria-label="Open Search"
						onClick={openSearch}
						onKeyDown={(e) => handleKeyActivate(e, openSearch)}
					>
						<HiOutlineSearch />
					</button>
					<button
						className="headerIconBtn"
						tabIndex="0"
						aria-label="Toggle Mobile Menu"
						onClick={openMobileMenu}
						onKeyDown={(e) => handleKeyActivate(e, openMobileMenu)}
					>
						{mobileMenu ? <VscChromeClose /> : <SlMenu />}
					</button>
				</div>
			</ContentWrapper>

			{showSearch && (
				<div className="searchBar">
					<ContentWrapper>
						<div className="searchInput">
							<input
								type="text"
								tabIndex="0"
								placeholder="Search for movies or tv shows.."
								value={query}
								readOnly={isReadOnly}
								onChange={(e) => setQuery(e.target.value)}
								onClick={() => setIsReadOnly(false)}
								onBlur={() => setIsReadOnly(true)}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || code === 13 || code === 23 || code === 66) {
										if (isReadOnly) {
											e.preventDefault();
											setIsReadOnly(false);
										} else {
											searchQuery(e);
										}
									}
								}}
							/>
							<button
								className="closeSearchBtn"
								tabIndex="0"
								aria-label="Close Search"
								onClick={() => setShowSearch(false)}
								onKeyDown={(e) => handleKeyActivate(e, () => setShowSearch(false))}
							>
								<VscChromeClose />
							</button>
						</div>
					</ContentWrapper>
				</div>
			)}
		</header>
	);
};

export default Header;
