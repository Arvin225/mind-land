import dayjs from "dayjs";

const getCurrentDateTime = () => {
    return dayjs().format('YYYY-MM-DD HH:mm');
}

export default getCurrentDateTime