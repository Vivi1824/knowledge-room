import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSummary } from "../api/wikipedia";
import "../styles/room.css";

export default function DetailRoom() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    getSummary(id).then(setData);
  }, [id]);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="detail-room">
      <h1>{data.title}</h1>

      <div className="card">
        <img src={data.thumbnail?.source} />
        <p>{data.extract}</p>
      </div>
    </div>
  );
}