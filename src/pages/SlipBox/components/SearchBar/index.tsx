import { Input } from "antd"
const { Search } = Input

function SearchBar() {

    return (
        <Search
            placeholder="Ctrl+K"
            allowClear
            onSearch={(value, _e, info) => { }}
            size="large"
            // variant="filled"
            style={{
                width: 218.182,
            }}
        />
    )
}

export default SearchBar