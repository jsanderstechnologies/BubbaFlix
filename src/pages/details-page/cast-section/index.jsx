/* eslint-disable react/prop-types */
import { useSelector } from "react-redux";

import "./index.scss";

import ContentWrapper from "../../../components/content-wrapper";
import Img from "../../../components/lazy-load";
import avatar from "../../../assets/avatar.png";

const Cast = ({ data, loading }) => {
	const { url } = useSelector((state) => state.home);

	const skeleton = () => {
		return (
			<div className="skItem">
				<div className="circle skeleton"></div>
				<div className="row skeleton"></div>
				<div className="row2 skeleton"></div>
			</div>
		);
	};
	return (
		<div className="castSection">
			<ContentWrapper>
				<div className="sectionHeading">Top Cast</div>
				{!loading ? (
					<div className="listItems">
						{data?.map((item) => {
							const profileBase = url?.profile || "https://image.tmdb.org/t/p/original";
							const avatarUrl = item.profile_path
								? profileBase + item.profile_path
								: avatar;
							return (
								<div key={item.id} className="listItem">
									<div className="profileImg">
										<Img src={avatarUrl} />
									</div>
									<div className="name">{item.name}</div>
									<div className="character">
										{item.character}
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="castSkeleton">
						{skeleton()}
						{skeleton()}
						{skeleton()}
						{skeleton()}
						{skeleton()}
						{skeleton()}
					</div>
				)}
			</ContentWrapper>
		</div>
	);
};

export default Cast;
