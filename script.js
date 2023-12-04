'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');
const changeBtn = document.querySelector('.changeBtn');
const resetBtn = document.querySelector('.resetAllBtn');
const deleteBtn = document.querySelector('.deleteSelectedBtn');
const distanceSortBtn = document.querySelector('.sortByDistance');
const durationSortBtn = document.querySelector('.sortByDuration');
const showWorkoutsBtn = document.querySelector('.showWorkoutsOnMap');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //km
    this.duration = duration; //min
  }
  _setDescription() {
    this.type === 'running'
      ? (this.description = `Пробежка ${new Intl.DateTimeFormat('ru-RU').format(
          this.date
        )}`)
      : (this.description = `Велотренировка ${new Intl.DateTimeFormat(
          'ru-RU'
        ).format(this.date)}`);
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, temp) {
    super(coords, distance, duration);
    this.temp = temp;
    this.calculatePace();
    this._setDescription();
  }
  calculatePace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, climb) {
    super(coords, distance, duration);
    this.climb = climb;
    this.calculateSpeed();
    this._setDescription();
  }
  calculateSpeed() {
    this.speed = this.distance / this.duration / 60;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #changeState = false;
  #selectedWorkout;
  constructor() {
    this._getPosition();
    this._getLocalStorageData();
    form.addEventListener('submit', event =>
      !this.#changeState
        ? this._newWorkout.bind(this)(event)
        : this._acceptChanges(event)
    );
    inputType.addEventListener('change', this._toggleClimbField);
    containerWorkouts.addEventListener('click', event =>
      !this.#changeState ? this._moveToWorkout(event) : this._showWorkout(event)
    );
    changeBtn.addEventListener('click', this._changeStatement.bind(this));
    resetBtn.addEventListener('click', this._reset);
    deleteBtn.addEventListener('click', this._deleteWorkout.bind(this));
    durationSortBtn.addEventListener(
      'click',
      this._sortWorkoutsByDuration.bind(this)
    );
    distanceSortBtn.addEventListener(
      'click',
      this._sortWorkoutsByDistance.bind(this)
    );
    showWorkoutsBtn.addEventListener('click', this._zoomMap.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Невозможно получить ваше местоположение');
        }
      );
    }
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(workout => {
      this._dislpayWorkout(workout);
    });
  }
  _hideForm() {
    inputClimb.value =
      inputDistance.value =
      inputDuration.value =
      inputTemp.value =
        '';
    form.classList.add('hidden');
  }

  _showForm(event) {
    this.#mapEvent = event;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _toggleClimbField() {
    inputClimb.closest('.form__row').classList.toggle('form__row--hidden');
    inputTemp.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(event) {
    const areNumber = (...numbers) =>
      numbers.every(num => Number.isFinite(num));
    const arePositive = (...numbers) => numbers.every(num => num > 0);
    event.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // получить данные из формы
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    //если тренировка является пробежкой, создать running
    if (type === 'running') {
      const temp = +inputTemp.value;
      // проверка правильности данных
      if (
        !areNumber(distance, duration, temp) ||
        !arePositive(distance, duration, temp)
      )
        return alert('Введите положительное число');

      workout = new Running([lat, lng], distance, duration, temp);
    }
    //если тренировка является велопробежкой, создать cycling
    if (type === 'cycling') {
      const climb = +inputClimb.value;
      // проверка правильности данных
      if (
        !areNumber(distance, duration, climb) ||
        !arePositive(distance, duration)
      )
        return alert('Введите положительное число');
      workout = new Cycling([lat, lng], distance, duration, climb);
    }
    //добавить новый объект в массив тренировок
    this.#workouts.push(workout);
    //отобразить тренировку на карте
    this._dislpayWorkout(workout);
    //отобращить тренировку в списке
    this._dislpayWorkoutOnSidebar(workout);
    //спрятать форму и очистеть поля ввода
    this._hideForm();
    // Добавить все тренировки в локальное хранилище
    this._addWorkoutsToLocalStorage();
  }

  _dislpayWorkout(workout) {
    L.marker(workout.coords, { id: workout.id })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
          id: workout.id,
        })
      )
      .setPopupContent(
        `${workout.type === 'runnig' ? '🏃' : '🚵‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  _createWorkoutHTML(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details"> 
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃' : '🚵‍♂️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">км</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">мин</span>
    </div>
    `;

    if (workout.type === 'running') {
      html += ` 
    <div class="workout__details">
      <span class="workout__icon">📏⏱</span>
      <span class="workout__value">${workout.pace.toFixed(2)}</span>
      <span class="workout__unit">мин/км</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">👟⏱</span>
      <span class="workout__value">${workout.temp}</span>
      <span class="workout__unit">шаг/мин</span>
    </div>
    </li>`;
    } else {
      html += `
    <div class="workout__details">
      <span class="workout__icon">📏⏱</span>
      <span class="workout__value">${workout.speed.toFixed(2)}</span>
      <span class="workout__unit">км/ч</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🏔</span>
      <span class="workout__value">${workout.climb}</span>
      <span class="workout__unit">м</span>
    </div>
  </li>`;
    }
    return html;
  }

  _createDOMElementFromHTML(html) {
    let template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
  }

  _dislpayWorkoutOnSidebar(workout) {
    form.insertAdjacentHTML('afterend', this._createWorkoutHTML(workout));
  }

  _moveToWorkout(event) {
    const workoutElement = event.target.closest('.workout');
    if (!workoutElement) return;
    const workout = this.#workouts.find(
      item => item.id === workoutElement.dataset.id
    );
    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: { duration: 1 },
    });
  }
  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  _addWorkoutsToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    data.forEach(workout => {
      const [lat, lng] = workout.coords;
      const type = workout.type;
      const distance = workout.distance;
      const duration = workout.duration;
      let loadedWorkout;
      if (type === 'running') {
        const temp = workout.temp;
        loadedWorkout = new Running([lat, lng], distance, duration, temp);
      }
      //если тренировка является велопробежкой, создать cycling
      if (type === 'cycling') {
        const climb = workout.climb;
        loadedWorkout = new Cycling([lat, lng], distance, duration, climb);
      }
      loadedWorkout.id = workout.id;
      loadedWorkout.date = workout.date;
      loadedWorkout._setDescription;
      this.#workouts.push(loadedWorkout);
    });

    // //заменить объект в массиве тренировок
    this.#workouts.forEach(workout => {
      this._dislpayWorkoutOnSidebar(workout);
    });
  }

  //  переключение режима просмотра/редактирования
  _changeStatement() {
    if (this.#changeState) {
      this.#changeState = false;
      this._hideForm();
      document
        .querySelectorAll('.deleteBtns')
        .forEach(item => item.classList.add('btn--hidden'));
      [].forEach.call(containerWorkouts.children, workout =>
        workout.classList.remove('workout--selected')
      );
    } else {
      this.#changeState = true;
      this._showForm();
      document
        .querySelectorAll('.deleteBtns')
        .forEach(item => item.classList.remove('btn--hidden'));
    }
  }

  //  возможность редактирования тренировки
  _showWorkout(event) {
    const workoutElement = event.target.closest('.workout');
    if (!workoutElement) return;
    this.#selectedWorkout = workoutElement;
    [].forEach.call(containerWorkouts.children, workout =>
      workout.classList.remove('workout--selected')
    );
    workoutElement.classList.add('workout--selected');
  }
  _acceptChanges(event) {
    event.preventDefault();
    const selectedWorkout = this.#workouts.find(
      item => item.id === this.#selectedWorkout.dataset.id
    );
    const selectedWorkoutId = this.#workouts.findIndex(
      item => item.id === this.#selectedWorkout.dataset.id
    );
    const areNumber = (...numbers) =>
      numbers.every(num => Number.isFinite(num));
    const arePositive = (...numbers) => numbers.every(num => num > 0);

    const [lat, lng] = selectedWorkout.coords;
    let workout;
    // получить данные из формы
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    //если тренировка является пробежкой, создать running
    if (type === 'running') {
      const temp = +inputTemp.value;
      // проверка правильности данных
      if (
        !areNumber(distance, duration, temp) ||
        !arePositive(distance, duration, temp)
      )
        return alert('Введите положительное число');

      workout = new Running([lat, lng], distance, duration, temp);
    }
    //если тренировка является велопробежкой, создать cycling
    if (type === 'cycling') {
      const climb = +inputClimb.value;
      // проверка правильности данных
      if (
        !areNumber(distance, duration, climb) ||
        !arePositive(distance, duration)
      )
        return alert('Введите положительное число');
      workout = new Cycling([lat, lng], distance, duration, climb);
    }
    workout.id = selectedWorkout.id;
    workout.date = selectedWorkout.date;

    workout._setDescription;

    //заменить объект в массиве тренировок
    this.#workouts[selectedWorkoutId] = workout;
    // Добавить все тренировки в локальное хранилище
    this._addWorkoutsToLocalStorage();

    //Замена исправленной тренировки на боковой панели

    const replaceHTML = this._createDOMElementFromHTML(
      this._createWorkoutHTML(this.#workouts[selectedWorkoutId])
    );
    containerWorkouts.replaceChild(replaceHTML, this.#selectedWorkout);

    //заново отобразить карту
    this.#workouts.forEach(workout => {
      this._dislpayWorkout(workout);
    });

    //спрятать форму и сменить статус внесения изменений
    this._changeStatement();
  }

  // Удаление любой тренировки, ДОРАБОТАТЬ удаление маркера на карте(готово)
  _deleteWorkout() {
    this.#selectedWorkout.remove();
    const id = this.#selectedWorkout.getAttribute('data-id');
    const selectedWorkoutId = this.#workouts.findIndex(
      item => item.id === this.#selectedWorkout.dataset.id
    );
    this.#map.eachLayer(layer => {
      if (layer.options.id == id) {
        this.#map.removeLayer(layer);
      }
    });
    if (selectedWorkoutId === -1) return;
    this.#workouts.splice(selectedWorkoutId, 1);
    this._addWorkoutsToLocalStorage();
  }
  _sortWorkoutsByDuration() {
    this.#workouts.sort((x, y) => x.duration - y.duration);
    const workoutsOnSidebar = document.querySelectorAll('.workout');

    [].forEach.call(workoutsOnSidebar, workout => workout.remove());
    this.#workouts.forEach(workout => {
      this._dislpayWorkoutOnSidebar(workout);
    });
  }
  _sortWorkoutsByDistance() {
    this.#workouts.sort((x, y) => x.distance - y.distance);
    const workoutsOnSidebar = document.querySelectorAll('.workout');
    [].forEach.call(workoutsOnSidebar, workout => workout.remove());
    this.#workouts.forEach(workout => {
      this._dislpayWorkoutOnSidebar(workout);
    });
  }
  _zoomMap() {
    const latLngArrow = this.#workouts.map(workout => workout.coords);
    this.#map.fitBounds(latLngArrow);
  }
}
const app = new App();

// Сброс данных из локального хранилища CHECK

//  возможность редактирования тренировки CHECK

//  возможность удаления тренировки CHECK

//  возможность удалить все тренировки (Все равно что сброс данных) CHECK

//  возможность сортировки тренировки по полю расстояние или продолжительность CHECK

//  пересоздавать объекты поступающие из локального хранилища, с привязкой к классам running или cycling CHECK

//  возможность расположения карты так, чтобы отображались все тренировки (leaflet) CHECK
