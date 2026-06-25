import { useParams } from "react-router-dom";
import DraftList from "./DraftList";
import DraftEditor from "./DraftEditor";

export default function Draft() {
    const { id } = useParams();
    // /draft         → 列表态
    // /draft/:id     → 编辑态
    return id ? <DraftEditor docId={Number(id)} /> : <DraftList />;
}
