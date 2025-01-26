const DAYS_IN_A_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_IN_A_YEAR = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ascendingButton = document.getElementById("asc_btn");
const descendingButton = document.getElementById("desc_btn");

let sorting = 'asc';
const setSorting = (value) => { sorting = value };
const getSorting = () => sorting;

ascendingButton.addEventListener("click", () => setSorting('asc'));
descendingButton.addEventListener("click", () => setSorting('desc'));


const loadingElement = document.getElementById("loading");
const errorElement = document.getElementById("error");
const historyContainerElement = document.getElementById("history");

const showElement = (element, display = "flex") => {
    if(!element) return;
    element.classList.remove("hidden");
    element.classList.add(display);
}
const hideElement = (element, display = "flex") => {
    if(!element) return;
    element.classList.remove(display);
    element.classList.add("hidden");
}

async function fetchSchedule () {
    try {
        showElement(loadingElement);
        hideElement(historyContainerElement);
        hideElement(errorElement);

        const response = await fetch('/schedule');
        const result = await response.json();

        if(!(response.status >= 200 && response.status < 300)) throw result;

        for(const history of result.updateHistory) {
            historyContainerElement.appendChild(renderHistory(history));
        }
        
        showElement(historyContainerElement);
    } catch (error) {
        showElement(errorElement);
        console.error(error);
    } finally {
        hideElement(loadingElement);
    }
};

function renderHistory(history) {
    const historyDate = new Date(history.date);
    const container = document.createElement("li");
    container.setAttribute("class", "p-6 rounded-xl flex flex-col gap-6 bg-white/5");

    const dateContainer = document.createElement("div");
    dateContainer.setAttribute("class", "flex items-center justify-between gap-4");

    const date = document.createElement("h3");
    date.setAttribute("class", "font-semibold text-2xl tracking-tight");
    date.innerText = `${MONTHS_IN_A_YEAR[historyDate.getMonth()]} ${historyDate.getDate()}, ${historyDate.getFullYear()}`;

    const day = document.createElement("span");
    day.setAttribute("class", "px-4 py-1 rounded-full bg-white/5 text-sm text-gray-300");
    day.innerText = `${DAYS_IN_A_WEEK[historyDate.getDay()]}`;

    dateContainer.appendChild(date);
    dateContainer.appendChild(day);

    const table = document.createElement("div");
    table.setAttribute("class", "flex flex-col border border-white/5 rounded-lg");

    const row1 = createRow({ isHeader: true, firstColumnValue: "", secondColumnValue: "Matches", thirdColumnValue: "Head-to-Heads" });
    const row2 = createRow({ isHeader: false, firstColumnValue: "Added", secondColumnValue: history.matchesAdded, thirdColumnValue: history.headToHeadsAdded });
    const row3 = createRow({ isHeader: false, firstColumnValue: "Deleted", secondColumnValue: history.matchesDeleted, thirdColumnValue: history.headToHeadsDeleted });
    const row4 = createRow({ isHeader: false, firstColumnValue: "Total left", secondColumnValue: history.totalMatches, thirdColumnValue: history.totalHeadToHeads });

    table.appendChild(row1);
    table.appendChild(row2);
    table.appendChild(row3);
    table.appendChild(row4);

    container.appendChild(dateContainer);
    container.appendChild(table);

    return container;
};

function createRow({ isHeader, firstColumnValue, secondColumnValue, thirdColumnValue }) {
    const container = document.createElement("div");
    container.setAttribute("class", `flex border-b border-white/5 last:border-transparent ${isHeader ? 'h-10' : 'h-12'}`);

    const firstColumn = document.createElement("span");
    firstColumn.setAttribute("class", "flex items-center px-4 w-1/4 text-sm text-gray-400");
    firstColumn.innerText = firstColumnValue

    const secondColumn = document.createElement("span");
    secondColumn.setAttribute("class", `px-4 flex items-center justify-center border-l border-white/5 flex-1 text-center ${isHeader ? 'text-sm text-gray-400' : 'text-gray-200 font-semibold'}`);
    secondColumn.innerText = secondColumnValue

    const thirdColumn = document.createElement("span");
    thirdColumn.setAttribute("class", `px-4 flex items-center justify-center border-l border-white/5 flex-1 text-center ${isHeader ? 'text-sm text-gray-400' : 'text-gray-200 font-semibold'}`);
    thirdColumn.innerText = thirdColumnValue

    container.appendChild(firstColumn);
    container.appendChild(secondColumn);
    container.appendChild(thirdColumn);

    return container;
}

fetchSchedule();