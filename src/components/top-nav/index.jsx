import { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HiOutlineSearch, HiOutlineFilm } from "react-icons/hi";
import { AiFillStar } from "react-icons/ai";
import { FiSettings, FiHome, FiTv, FiInfo, FiLogOut } from "react-icons/fi";
import { AuthContext } from "../../context/AuthContext";
import ContentWrapper from "../content-wrapper";
import ConfirmModal from "../confirm-modal";
import "./index.scss";

const TopNav = () => {
	const [query, setQuery] = useState("");
	const [showSignOutModal, setShowSignOutModal] = useState(false);
	const navigate = useNavigate();
	const { logout, user } = useContext(AuthContext);
	const location = useLocation();

	const handleSearch = (e) => {
		const code = e.keyCode;
		if ((e.key === "Enter" || code === 13 || code === 23 || code === 66) && query.trim().length > 0) {
			e.preventDefault();
			navigate(`/search/${encodeURIComponent(query.trim())}`);
		}
	};

	const handleSearchClick = () => {
		if (query.trim().length > 0) {
			navigate(`/search/${encodeURIComponent(query.trim())}`);
		}
	};

	const isActive = (path) => {
		const current = location.pathname;
		
		if (path === "/") {
			return current === "/" ? "active" : "";
		}
		
		if (path === "/explore/movie") {
			return (current.startsWith("/explore/movie") || current.startsWith("/movie/") || current.startsWith("/collection/")) ? "active" : "";
		}
		
		if (path === "/explore/tv") {
			return (current.startsWith("/explore/tv") || current.startsWith("/tv/")) ? "active" : "";
		}
		
		if (path === "/search") {
			return current.startsWith("/search") ? "active" : "";
		}
		
		if (path === "/favorites") {
			return current.startsWith("/favorites") ? "active" : "";
		}

		if (path === "/settings") {
			return current.startsWith("/settings") ? "active" : "";
		}

		if (path === "/about") {
			return current.startsWith("/about") ? "active" : "";
		}

		return current === path ? "active" : "";
	};

	return (
		<>
			<nav className="topNav">
				<ContentWrapper>
					<div className="topNavInner">
						{/* App Logo - Non-focusable branding display */}
						<div className="navLogo" style={{ pointerEvents: "none", userSelect: "none" }}>
							<img src="/logo.png" alt="BubbaFlix TV" tabIndex="-1" style={{ pointerEvents: "none" }} />
						</div>

						{/* Navigation Item Links */}
						<div className="navLinks">
							<button
								className={`navBtn ${isActive("/")}`}
								tabIndex="0"
								onClick={() => navigate("/")}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
										e.preventDefault();
										navigate("/");
									}
								}}
							>
								<FiHome className="navIcon" />
								<span>Home</span>
							</button>

							<button
								className={`navBtn ${isActive("/search")}`}
								tabIndex="0"
								onClick={() => navigate("/search")}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
										e.preventDefault();
										navigate("/search");
									}
								}}
							>
								<HiOutlineSearch className="navIcon" />
								<span>Search</span>
							</button>

							<button
								className={`navBtn ${isActive("/favorites")}`}
								tabIndex="0"
								onClick={() => navigate("/favorites")}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
										e.preventDefault();
										navigate("/favorites");
									}
								}}
							>
								<AiFillStar className="navIcon" style={{ color: "#ffd700" }} />
								<span>Favorites</span>
							</button>

							<button
								className={`navBtn ${isActive("/explore/movie")}`}
								tabIndex="0"
								onClick={() => navigate("/explore/movie")}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
										e.preventDefault();
										navigate("/explore/movie");
									}
								}}
							>
								<HiOutlineFilm className="navIcon" />
								<span>Movies</span>
							</button>

							<button
								className={`navBtn ${isActive("/explore/tv")}`}
								tabIndex="0"
								onClick={() => navigate("/explore/tv")}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
										e.preventDefault();
										navigate("/explore/tv");
									}
								}}
							>
								<FiTv className="navIcon" />
								<span>TV Series</span>
							</button>

							{user?.role === "admin" && (
								<button
									className={`navBtn ${isActive("/usage")}`}
									tabIndex="0"
									onClick={() => navigate("/usage")}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66) {
											e.preventDefault();
											navigate("/usage");
										}
									}}
								>
									<FiInfo /> Usage
								</button>
							)}

							<button
								className={`navBtn ${isActive("/settings")}`}
								tabIndex="0"
								onClick={() => navigate("/settings")}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
										e.preventDefault();
										navigate("/settings");
									}
								}}
							>
								<FiSettings className="navIcon" />
								<span>Settings</span>
							</button>

							<button
								className={`navBtn ${isActive("/about")}`}
								tabIndex="0"
								onClick={() => navigate("/about")}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
										e.preventDefault();
										navigate("/about");
									}
								}}
							>
								<FiInfo className="navIcon" />
								<span>About</span>
							</button>

							<button
								className="navBtn"
								tabIndex="0"
								onClick={() => setShowSignOutModal(true)}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
										e.preventDefault();
										setShowSignOutModal(true);
									}
								}}
							>
								<FiLogOut className="navIcon" />
								<span>Sign Out</span>
							</button>
						</div>
					</div>
				</ContentWrapper>
			</nav>

			<ConfirmModal
				show={showSignOutModal}
				setShow={setShowSignOutModal}
				title="Sign Out"
				message="Are you sure you want to sign out of BubbaFlix?"
				confirmText="Sign Out"
				cancelText="Cancel"
				onConfirm={logout}
			/>
		</>
	);
};

export default TopNav;
