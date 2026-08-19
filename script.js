const elements = {
  monthTitle: document.getElementById("monthTitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  prevMonthButton: document.getElementById("prevMonthButton"),
  nextMonthButton: document.getElementById("nextMonthButton"),
  todayButton: document.getElementById("todayButton"),

  selectedDateTitle: document.getElementById("selectedDateTitle"),
  scheduleCount: document.getElementById("scheduleCount"),
  scheduleInput: document.getElementById("scheduleInput"),
  addScheduleButton: document.getElementById("addScheduleButton"),
  scheduleList: document.getElementById("scheduleList")
};

const today = new Date();

let displayYear = today.getFullYear();
let displayMonth = today.getMonth();
let selectedDate = null;

const schedules = {};

elements.prevMonthButton.addEventListener("click", () => {
  displayMonth--;

  if (displayMonth < 0) {
    displayMonth = 11;
    displayYear--;
  }

  renderCalendar();
});

elements.nextMonthButton.addEventListener("click", () => {
  displayMonth++;

  if (displayMonth > 11) {
    displayMonth = 0;
    displayYear++;
  }

  renderCalendar();
});

elements.todayButton.addEventListener("click", () => {
  selectDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
});

elements.addScheduleButton.addEventListener("click", addSchedule);

elements.scheduleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addSchedule();
  }
});

function renderCalendar() {
  elements.monthTitle.textContent =
    `${displayYear}年${displayMonth + 1}月`;

  elements.calendarGrid.innerHTML = "";

  const firstDay = new Date(displayYear, displayMonth, 1);
  const startWeekday = firstDay.getDay();

  const firstCellDate = new Date(
    displayYear,
    displayMonth,
    1 - startWeekday
  );

  for (let i = 0; i < 42; i++) {
    const date = new Date(
      firstCellDate.getFullYear(),
      firstCellDate.getMonth(),
      firstCellDate.getDate() + i
    );

    elements.calendarGrid.appendChild(createDayButton(date));
  }
}

function createDayButton(date) {
  const button = document.createElement("button");
  button.className = "calendar-day";

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = date.getDay();
  const dateKey = formatDateKey(year, month, day);

  if (month !== displayMonth) {
    button.classList.add("other-month");
  }

  if (weekday === 0) {
    button.classList.add("sunday");
  }

  if (weekday === 6) {
    button.classList.add("saturday");
  }

  if (isToday(date)) {
    button.classList.add("today");
  }

  if (selectedDate === dateKey) {
    button.classList.add("selected");
  }

  const number = document.createElement("span");
  number.className = "day-number";
  number.textContent = day;
  button.appendChild(number);

  const daySchedules = schedules[dateKey] || [];

  if (daySchedules.length > 0) {
    const dotRow = document.createElement("div");
    dotRow.className = "schedule-dot-row";

    daySchedules.slice(0, 3).forEach(() => {
      const dot = document.createElement("span");
      dot.className = "schedule-dot";
      dotRow.appendChild(dot);
    });

    button.appendChild(dotRow);

    const preview = document.createElement("div");
    preview.className = "schedule-preview";
    preview.textContent = daySchedules[0];
    button.appendChild(preview);
  }

  button.addEventListener("click", () => {
    selectDate(year, month, day);
  });

  return button;
}

function selectDate(year, month, day) {
  selectedDate = formatDateKey(year, month, day);
  displayYear = year;
  displayMonth = month;

  elements.selectedDateTitle.textContent =
    `${year}年${month + 1}月${day}日`;

  elements.scheduleInput.disabled = false;
  elements.addScheduleButton.disabled = false;

  renderCalendar();
  renderSchedules();
}

function addSchedule() {
  if (!selectedDate) {
    return;
  }

  const text = elements.scheduleInput.value.trim();

  if (!text) {
    return;
  }

  if (!schedules[selectedDate]) {
    schedules[selectedDate] = [];
  }

  schedules[selectedDate].push(text);
  elements.scheduleInput.value = "";

  renderCalendar();
  renderSchedules();
}

function renderSchedules() {
  if (!selectedDate) {
    elements.scheduleCount.textContent = "0件";
    return;
  }

  const items = schedules[selectedDate] || [];

  elements.scheduleCount.textContent = `${items.length}件`;
  elements.scheduleList.innerHTML = "";

  if (items.length === 0) {
    elements.scheduleList.innerHTML = `
      <div class="empty-schedule">
        この日の予定はありません。
      </div>
    `;
    return;
  }

  items.forEach((text, index) => {
    const item = document.createElement("div");
    item.className = "schedule-item";

    const scheduleText = document.createElement("span");
    scheduleText.className = "schedule-text";
    scheduleText.textContent = text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", "予定を削除");

    deleteButton.addEventListener("click", () => {
      deleteSchedule(index);
    });

    item.appendChild(scheduleText);
    item.appendChild(deleteButton);

    elements.scheduleList.appendChild(item);
  });
}

function deleteSchedule(index) {
  if (!selectedDate || !schedules[selectedDate]) {
    return;
  }

  schedules[selectedDate].splice(index, 1);

  if (schedules[selectedDate].length === 0) {
    delete schedules[selectedDate];
  }

  renderCalendar();
  renderSchedules();
}

function formatDateKey(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

function isToday(date) {
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

renderCalendar();
