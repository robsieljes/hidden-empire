import { Shoplifting } from './actions/Shoplifting.js';
import { Robbery } from './actions/Robbery.js';
import { Confess } from './actions/Confess.js';
import Sprinkhaan from './sprinkhaan/js/Sprinkhaan.js';

export class Actions {
  constructor (app) {
    this.app = app;
    this.currentAction = false;
  }

  init () {
    this.app.on('map.click', (event) => {
      let bbox = [
        [event.point.x - 5, event.point.y - 5],
        [event.point.x + 5, event.point.y + 5]
      ];

      let features = this.app.map.queryRenderedFeatures(bbox, {
        layers: ['poi_z14', 'poi_z15', 'poi_z16']
      });

      this.showMenu(features);
    })
  }

  showMenu (features) {
    if (document.querySelector('#sprinkhaan')) {
      document.querySelector('#sprinkhaan').remove();
    }

    if (!features.length) { return }

    let actions = new Set();

    features.forEach((feature) => {
      this.getTypes().forEach((ActionType) => {
        if (ActionType.applies(feature.properties)) {
          actions.add({
            'text': ActionType.buttonText(feature.properties),
            'action': ActionType,
            'location': feature
          });
        }
      });
    });

    if (!actions.size) { return }

    let markup = document.createElement('div');
    markup.classList.add('action-list');

    actions.forEach(action => {
      let actionItem = document.createElement('span');
      actionItem.classList.add('button');
      actionItem.innerText = action.text;
      actionItem.addEventListener('click', () => {
        this.startAction(action.action, action.location);
        this.app.sprinkhaan.collapse(() => {
          this.app.sprinkhaan.destroy(() => {
            document.querySelector('#sprinkhaan').remove();
          });
        })
      });
      markup.appendChild(actionItem);
    });

    this.attachSprinkhaanMarkup(features[0].properties.name);
    document.querySelector('.sprinkhaan-content').appendChild(markup);

    this.app.sprinkhaan = new Sprinkhaan();
    this.app.sprinkhaan.show(() => {
      this.app.sprinkhaan.expand();
    });
  }

  attachSprinkhaanMarkup (title) {
    let output = `
    <div class="sprinkhaan-container" data-state="collapsed" id="sprinkhaan">
        <div class="sprinkhaan-header is-sticky">${title}</div>
        <div class="sprinkhaan-close-button"></div>
    
        <div class="sprinkhaan-inner">
            <div class="sprinkhaan-content-wrapper">
                <div class="sprinkhaan-header is-not-sticky">${title}</div>
                <div class="sprinkhaan-content"></div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', output);
  }

  startAction (action, location) {
    if (this.currentAction) { return }
    let markerElement = document.createElement('div');
    markerElement.classList.add('action-marker');

    let marker = new mapboxgl.Marker(markerElement)
      .setLngLat(location.geometry.coordinates)
      .addTo(this.app.map);

    this.currentAction = {
      action: action,
      marker: marker,
      location, location
    };

    let target = {
      latitude: Number(location.geometry.coordinates[1]).toFixed(3),
      longitude: Number(location.geometry.coordinates[0]).toFixed(2)
    };

    let watchId = navigator.geolocation.watchPosition((pos) => {
      let crd = pos.coords;

      if (target.latitude === Number(crd.latitude).toFixed(3) && target.longitude === Number(crd.longitude).toFixed(2)) {
        console.log('Congratulations, you reached the target');
        navigator.geolocation.clearWatch(watchId);
        this.currentAction = false;
        this.app.modules.score.add(action.points())
      }
    }, (err) => {
      console.warn('ERROR(' + err.code + '): ' + err.message);
    }, {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 0
    });
  }

  getTypes () {
    return new Map([
      ['Shoplifting', Shoplifting],
      ['Robbery', Robbery],
      ['Confess', Confess]
    ]);
  }
}