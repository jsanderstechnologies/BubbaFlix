/* eslint-disable no-unused-vars */
import "./index.scss";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useFetch from "../../../hooks/useFetch";
import { useSelector } from "react-redux";
import Img from "../../../components/lazy-load/index";
import ContentWrapper from "../../../components/content-wrapper";

const HeroBanner = () => {
	const [backgroundImg, setBackgroundImg] = useState("");
	const [query, setQuery] = useState("");
	const navigate = useNavigate();
	const { url } = useSelector((state) => state.home);

	const { data, loading } = useFetch("/movie/upcoming");

	useEffect(() => {
		if (data?.results?.length > 0) {
			const randomIndex = Math.floor(Math.random() * data.results.length);
			const bgPath = data.results[randomIndex]?.backdrop_path;
			if (bgPath && url.backdrop) {
				setBackgroundImg(url.backdrop + bgPath);
			}
		}
	}, [data, url.backdrop]);

	const handleSearch = () => {
		if (query.trim().length > 0) {
			navigate(`search/${query.trim()}`);
		}
	};

	const searchQuery = (e) => {
		const code = e.keyCode;
		if ((e.key === "Enter" || code === 13 || code === 23 || code === 66) && query.trim().length > 0) {
			handleSearch();
		}
	};

	return (
		<div className="hero-banner">
			{!loading && (
				<div className="backdrop-img">
					<Img src={backgroundImg} />
				</div>
			)}

			<div className="opacity-layer"></div>

			<ContentWrapper>
				<div className="hero-banner-content">
					<img src="/logo.svg" alt="BubbaFlix Logo" className="hero-logo" />
					<span className="title">Welcome</span>
					<span className="sub-title">
						Your Cinematic Journey Begins Here
					</span>
					<div className="search-input-section">
						<input
							type="text"
							tabIndex="0"
							placeholder="Search for movies or tv shows.."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={searchQuery}
						/>
						<button
							tabIndex="0"
							onClick={handleSearch}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || code === 13 || code === 23 || code === 66) {
									handleSearch();
								}
							}}
						>
							Search
						</button>
					</div>
				</div>
			</ContentWrapper>
		</div>
	);
};

export default HeroBanner;
