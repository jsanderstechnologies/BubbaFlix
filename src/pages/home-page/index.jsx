import "./index.scss";
import TopNav from "../../components/top-nav";
import Trending from "./trending";
import Popular from "./popular";
import TopRated from "./top-rated";

const HomePage = () => {
	return (
		<div className="home-page">
			<TopNav />
			<Trending />
			<Popular />
			<TopRated />
		</div>
	);
};

export default HomePage;
