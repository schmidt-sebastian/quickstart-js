/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getAuth, signInAnonymously, Auth } from '@firebase/auth';
import { getApp, FirebaseApp, initializeApp } from '@firebase/app';
import {
  addDoc,
  getDocs,
  runTransaction,
  getFirestore,
  enableIndexedDbPersistence,
  collection,
  query,
  limit,
  onSnapshot,
  FirebaseFirestore,
  DocumentReference,
  Query,
  getDoc,
  doc,
  QuerySnapshot,
  where,
  orderBy,
  setLogLevel
} from '@firebase/firestore';
import Navigo from 'navigo';
import { MDCDialog } from '@material/dialog';
import { MDCToolbar } from '@material/toolbar';
import { MDCRipple } from '@material/ripple/component';
import mdcAutoInit from '@material/auto-init';

mdcAutoInit.register('MDCRipple', MDCRipple as any);

interface Rating {
  rating?: number;
  text?: string;
  userName?: string;
  userId?: string;
  timestamp?: Date;
}

initializeApp({
  apiKey: 'AIzaSyAWmMIPWNAlJ3n9xyRcpfKaUCmnLgTZnMw',
  authDomain: 'its-april.firebaseapp.com',
  databaseURL: 'https://its-april.firebaseio.com',
  projectId: 'its-april',
  storageBucket: 'its-april.appspot.com',
  messagingSenderId: '984636993069',
  appId: '1:984636993069:web:ba87f2195f38a997c392a4'
});

/**
 * Initializes the FriendlyEats app.
 */
class FriendlyEats {
  private app!: FirebaseApp;
  private auth!: Auth;
  private firestore!: FirebaseFirestore;
  private router!: Navigo;

  private filters: {
    city: string;
    price: string;
    category: string;
    sort: string;
  } = {
    city: '',
    price: '',
    category: '',
    sort: 'Rating'
  };
  private templates: Record<string, Element> = {};

  ID_CONSTANT = 'fir-';

  private data: {
    words: string[];
    cities: string[];
    categories: string[];
    ratings: Rating[];
  } = {
    words: [
      'Bar',
      'Fire',
      'Grill',
      'Drive Thru',
      'Place',
      'Best',
      'Spot',
      'Prime',
      'Eatin\''
    ],
    cities: [
      'Albuquerque',
      'Arlington',
      'Atlanta',
      'Austin',
      'Baltimore',
      'Boston',
      'Charlotte',
      'Chicago',
      'Cleveland',
      'Colorado Springs',
      'Columbus',
      'Dallas',
      'Denver',
      'Detroit',
      'El Paso',
      'Fort Worth',
      'Fresno',
      'Houston',
      'Indianapolis',
      'Jacksonville',
      'Kansas City',
      'Las Vegas',
      'Long Island',
      'Los Angeles',
      'Louisville',
      'Memphis',
      'Mesa',
      'Miami',
      'Milwaukee',
      'Nashville',
      'New York',
      'Oakland',
      'Oklahoma',
      'Omaha',
      'Philadelphia',
      'Phoenix',
      'Portland',
      'Raleigh',
      'Sacramento',
      'San Antonio',
      'San Diego',
      'San Francisco',
      'San Jose',
      'Tucson',
      'Tulsa',
      'Virginia Beach',
      'Washington'
    ],
    categories: [
      'Brunch',
      'Burgers',
      'Coffee',
      'Deli',
      'Dim Sum',
      'Indian',
      'Italian',
      'Mediterranean',
      'Mexican',
      'Pizza',
      'Ramen',
      'Sushi'
    ],
    ratings: [
      {
        rating: 1,
        text: 'Would never eat here again!'
      },
      {
        rating: 2,
        text: 'Not my cup of tea.'
      },
      {
        rating: 3,
        text: 'Exactly okay :/'
      },
      {
        rating: 4,
        text: 'Actually pretty good, would recommend!'
      },
      {
        rating: 5,
        text: 'This is my favorite place. Literally.'
      }
    ]
  };

  private dialogs: Record<string, MDCDialog> = {};

  async init(): Promise<void> {
    const auth = getAuth();
    await signInAnonymously(auth);
    const firestore = getFirestore();
    enableIndexedDbPersistence(firestore);
    this.initTemplates();
    this.initRouter();
    this.initReviewDialog();
    this.initFilterDialog();
  }

  private restaurants!: Query;

  /**
   * Initializes the router for the FriendlyEats app.
   */
  initRouter() {
    this.app = getApp();
    this.auth = getAuth();
    this.firestore = getFirestore();
    this.restaurants = collection(this.firestore, 'restaurants');

    // setLogLevel('debug');

    this.router = new Navigo('/');

    this.router
      .on({
        '/': () => {
          this.updateQuery(this.filters);
        }
      })
      .on({
        '/setup': () => {
          this.viewSetup();
        }
      })
      .on({
        '/restaurants/:id': ({ data }) => {
          this.viewRestaurant(data.id);
        }
      })
      .resolve();

    const restaurants = query(this.restaurants, limit(1));
    onSnapshot(restaurants, snapshot => {
      if (snapshot.empty) {
        this.router.navigate('/setup');
      }
    });
  }

  private static getCleanPath(dirtyPath: string): string {
    if (dirtyPath.startsWith('/index.html')) {
      return dirtyPath
        .split('/')
        .slice(1)
        .join('/');
    } else {
      return dirtyPath;
    }
  }

  private getFirebaseConfig() {
    return this.app.options;
  }

  private static getRandomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  initTemplates() {
    this.templates = {};

    document.querySelectorAll('.template').forEach(el => {
      this.templates[el.getAttribute('id')!] = el;
    });
  }

  viewHome() {
    this.getAllRestaurants();
  }

  viewList(filters, filter_description) {
    if (!filter_description) {
      filter_description = 'any type of food with any price in any city.';
    }

    var mainEl = this.renderTemplate('main-adjusted');
    var headerEl = this.renderTemplate('header-base', {
      hasSectionHeader: true
    });

    this.replaceElement(
      headerEl.querySelector('#section-header'),
      this.renderTemplate('filter-display', {
        filter_description: filter_description
      })
    );

    this.replaceElement(document.querySelector('.header'), headerEl);
    this.replaceElement(document.querySelector('main'), mainEl);

    headerEl.querySelector('#show-filters')!.addEventListener('click', () => {
      this.dialogs.filter.open();
    });

    var renderResults = doc => {
      if (!doc) {
        var headerEl = this.renderTemplate('header-base', {
          hasSectionHeader: true
        });

        var noResultsEl = this.renderTemplate('no-results');

        this.replaceElement(
          headerEl.querySelector('#section-header'),
          this.renderTemplate('filter-display', {
            filter_description: filter_description
          })
        );

        headerEl
          .querySelector('#show-filters')!
          .addEventListener('click', () => {
            this.dialogs.filter.open();
          });

        this.replaceElement(document.querySelector('.header'), headerEl);
        this.replaceElement(document.querySelector('main'), noResultsEl);
        return;
      }
      var data = doc.data();
      data['.id'] = doc.id;
      data['go_to_restaurant'] = () => {
        this.router.navigate('/restaurants/1J1PbMly2219racyaeOd');
      };

      // check if restaurant card has already been rendered
      var existingRestaurantCardEl = mainEl.querySelector(
        '#' + this.ID_CONSTANT + doc.id
      );
      var el =
        existingRestaurantCardEl ||
        this.renderTemplate('restaurant-card', data);

      var ratingEl = el.querySelector('.rating')!;
      var priceEl = el.querySelector('.price')!;

      // clear out existing rating and price if they already exist
      if (existingRestaurantCardEl) {
        ratingEl.innerHTML = '';
        priceEl.innerHTML = '';
      }

      ratingEl.append(this.renderRating(data.avgRating));
      priceEl.append(this.renderPrice(data.price));

      if (!existingRestaurantCardEl) {
        mainEl.querySelector('#cards')!.append(el);
      }
    };

    if (
      filters.city ||
      filters.category ||
      filters.price ||
      filters.sort !== 'Rating'
    ) {
      this.getFilteredRestaurants(
        {
          city: filters.city || 'Any',
          category: filters.category || 'Any',
          price: filters.price || 'Any',
          sort: filters.sort
        },
        renderResults
      );
    } else {
      this.getAllRestaurants(renderResults);
    }

    var toolbar = MDCToolbar.attachTo(document.querySelector('.mdc-toolbar')!);
    toolbar.fixedAdjustElement = document.querySelector(
      '.mdc-toolbar-fixed-adjust'
    );
    mdcAutoInit();
  }

  viewSetup() {
    var headerEl = this.renderTemplate('header-base', {
      hasSectionHeader: false
    });

    var config = this.getFirebaseConfig();
    var noRestaurantsEl = this.renderTemplate('no-restaurants', config);

    var button = noRestaurantsEl.querySelector('#add_mock_data')!;
    var addingMockData = false;

    button.addEventListener('click', event => {
      if (addingMockData) {
        return;
      }

      addingMockData = true;

      (event.target as HTMLElement).style.opacity = '0.4';
      (event.target as HTMLElement).innerText = 'Please wait...';

      this.addMockRestaurants().then(() => {
        this.rerender();
      });
    });

    this.replaceElement(document.querySelector('.header'), headerEl);
    this.replaceElement(document.querySelector('main'), noRestaurantsEl);

    onSnapshot(query(this.restaurants, limit(1)), (snapshot: QuerySnapshot) => {
      if (snapshot.size && !addingMockData) {
        this.router.navigate('/');
      }
    });
  }

  initReviewDialog() {
    var dialog = document.querySelector('#dialog-add-review')!;
    this.dialogs.add_review = new MDCDialog(dialog);

    this.dialogs.add_review.listen('MDCDialog:closing', (e: CustomEvent) => {
      if (e.detail.action === 'cancel') {return;}

      var pathname = FriendlyEats.getCleanPath(document.location.pathname);
      var id = pathname.split('/')[2];

      this.addRating(id, {
        rating: rating,
        text: (dialog.querySelector('#text') as HTMLTextAreaElement).value!,
        userName: 'Anonymous (Web)',
        timestamp: new Date(),
        userId: this.auth.currentUser!.uid
      }).then(() => this.rerender());
    });

    var rating = 0;

    dialog.querySelectorAll('.star-input i').forEach(function(el) {
      var rate = function() {
        var after = false;
        rating = 0;
        ([] as HTMLElement[]).slice
          .call(el.parentNode!.children)
          .forEach(child => {
            if (!after) {
              rating++;
              child.innerText = 'star';
            } else {
              child.innerText = 'star_border';
            }
            after = after || child.isSameNode(el);
          });
      };
      el.addEventListener('mouseover', rate);
    });
  }

  initFilterDialog() {
    // TODO: Reset filter dialog to init state on close.
    this.dialogs.filter = new MDCDialog(
      document.querySelector('#dialog-filter-all')!
    );

    this.dialogs.filter.listen('MDCDialog:closing', () => {
      this.updateQuery(this.filters);
    });

    var dialog = document.querySelector('aside')!;
    var pages = dialog.querySelectorAll('.page')!;

    this.replaceElement(
      dialog.querySelector('#category-list'),
      this.renderTemplate('item-list', {
        items: ['Any'].concat(this.data.categories)
      })
    );

    this.replaceElement(
      dialog.querySelector('#city-list'),
      this.renderTemplate('item-list', {
        items: ['Any'].concat(this.data.cities)
      })
    );

    var renderAllList = () => {
      this.replaceElement(
        dialog.querySelector('#all-filters-list'),
        this.renderTemplate('all-filters-list', this.filters)
      );

      dialog.querySelectorAll('#page-all .mdc-list-item').forEach(function(el) {
        el.addEventListener('click', function() {
          var id = el.id
            .split('-')
            .slice(1)
            .join('-');
          displaySection(id);
        });
      });
    };

    var displaySection = id => {
      if (id === 'page-all') {
        renderAllList();
      }

      pages.forEach(sel => {
        if (sel.id === id) {
          (sel as HTMLElement).style.display = 'block';
        } else {
          (sel as HTMLElement).style.display = 'none';
        }
      });
    };

    pages.forEach(sel => {
      var type = sel.id.split('-')[1];
      if (type === 'all') {
        return;
      }

      sel.querySelectorAll('.mdc-list-item').forEach(el => {
        el.addEventListener('click', () => {
          this.filters[type] =
            el.textContent!.trim() === 'Any' ? '' : el.textContent!.trim();
          displaySection('page-all');
        });
      });
    });

    displaySection('page-all');
    dialog.querySelectorAll('.back').forEach(function(el) {
      el.addEventListener('click', function() {
        displaySection('page-all');
      });
    });
  }

  updateQuery(filters) {
    var query_description = '';

    if (filters.category !== '') {
      query_description += filters.category + ' places';
    } else {
      query_description += 'any restaurant';
    }

    if (filters.city !== '') {
      query_description += ' in ' + filters.city;
    } else {
      query_description += ' located anywhere';
    }

    if (filters.price !== '') {
      query_description += ' with a price of ' + filters.price;
    } else {
      query_description += ' with any price';
    }

    if (filters.sort === 'Rating') {
      query_description += ' sorted by rating';
    } else if (filters.sort === 'Reviews') {
      query_description += ' sorted by # of reviews';
    }

    this.viewList(filters, query_description);
  }

  viewRestaurant(id) {
    var sectionHeaderEl;

    return this.getRestaurant(id)
      .then(doc => {
        var data = doc.data()! as any;
        var dialog = this.dialogs.add_review;

        data.show_add_review = () => {
          dialog.open();
        };

        sectionHeaderEl = this.renderTemplate('restaurant-header', data);
        sectionHeaderEl
          .querySelector('.rating')
          .append(this.renderRating(data.avgRating));

        sectionHeaderEl
          .querySelector('.price')
          .append(this.renderPrice(data.price));
        return getDocs(
          query(collection(doc.ref, 'ratings'), orderBy('timestamp', 'desc'))
        );
      })
      .then(ratings => {
        var mainEl;

        if (ratings.size) {
          mainEl = this.renderTemplate('main');

          ratings.forEach(rating => {
            var data = rating.data();
            var el = this.renderTemplate('review-card', data);
            el.querySelector('.rating')!.append(this.renderRating(data.rating));
            mainEl.querySelector('#cards').append(el);
          });
        } else {
          mainEl = this.renderTemplate('no-ratings', {
            add_mock_data: () => {
              this.addMockRatings(id).then(() => {
                this.rerender();
              });
            }
          });
        }

        this.renderTemplate('header-base', {
          hasSectionHeader: true
        });

        this.replaceElement(document.querySelector('.header'), sectionHeaderEl);
        this.replaceElement(document.querySelector('main'), mainEl);
      })
      .then(() => {
        this.router.updatePageLinks();
      })
      .catch(err => {
        console.warn('Error rendering page', err);
      });
  }

  renderTemplate(id?, data?) {
    var template = this.templates[id];
    var el = template.cloneNode(true) as HTMLElement;
    el.removeAttribute('hidden');
    this.render(el, data);

    // set an id in case we need to access the element later
    if (data && data['.id']) {
      // for `querySelector` to work, ids must start with a string
      el.id = this.ID_CONSTANT + data['.id'];
    }

    return el;
  }

  render(el, data) {
    if (!data) {
      return;
    }

    var modifiers = {
      'data-fir-foreach': tel => {
        var field = tel.getAttribute('data-fir-foreach');
        var values = this.getDeepItem(data, field);

        values.forEach(function(value, index) {
          var cloneTel = tel.cloneNode(true);
          tel.parentNode.append(cloneTel);

          Object.keys(modifiers).forEach(function(selector) {
            var children = Array.prototype.slice.call(
              cloneTel.querySelectorAll('[' + selector + ']')
            );
            children.push(cloneTel);
            children.forEach(function(childEl) {
              var currentVal = childEl.getAttribute(selector);

              if (!currentVal) {
                return;
              }

              childEl.setAttribute(
                selector,
                currentVal.replace('~', field + '/' + index)
              );
            });
          });
        });

        tel.parentNode.removeChild(tel);
      },
      'data-fir-content': tel => {
        var field = tel.getAttribute('data-fir-content');
        tel.innerText = this.getDeepItem(data, field);
      },
      'data-fir-click': tel => {
        tel.addEventListener('click', () => {
          var field = tel.getAttribute('data-fir-click');
          this.getDeepItem(data, field)();
        });
      },
      'data-fir-if': tel => {
        var field = tel.getAttribute('data-fir-if');
        if (!this.getDeepItem(data, field)) {
          tel.style.display = 'none';
        }
      },
      'data-fir-if-not': tel => {
        var field = tel.getAttribute('data-fir-if-not');
        if (this.getDeepItem(data, field)) {
          tel.style.display = 'none';
        }
      },
      'data-fir-attr': tel => {
        var chunks = tel.getAttribute('data-fir-attr').split(':');
        var attr = chunks[0];
        var field = chunks[1];
        tel.setAttribute(attr, this.getDeepItem(data, field));
      },
      'data-fir-style': tel => {
        var chunks = tel.getAttribute('data-fir-style').split(':');
        var attr = chunks[0];
        var field = chunks[1];
        var value = this.getDeepItem(data, field);

        if (attr.toLowerCase() === 'backgroundimage') {
          value = 'url(' + value + ')';
        }
        tel.style[attr] = value;
      }
    };

    var preModifiers = ['data-fir-foreach'];

    preModifiers.forEach(selector => {
      var modifier = modifiers[selector];
      this.useModifier(el, selector, modifier);
    });

    Object.keys(modifiers).forEach(selector => {
      if (preModifiers.indexOf(selector) !== -1) {
        return;
      }

      var modifier = modifiers[selector];
      this.useModifier(el, selector, modifier);
    });
  }

  useModifier(el, selector, modifier) {
    el.querySelectorAll('[' + selector + ']').forEach(modifier);
  }

  getDeepItem(obj, path) {
    path.split('/').forEach(function(chunk) {
      obj = obj[chunk];
    });
    return obj;
  }

  renderRating(rating) {
    var el = this.renderTemplate('rating', {});
    for (var r = 0; r < 5; r += 1) {
      var star;
      if (r < Math.floor(rating)) {
        star = this.renderTemplate('star-icon', {});
      } else {
        star = this.renderTemplate('star-border-icon', {});
      }
      el.append(star);
    }
    return el;
  }

  renderPrice(price) {
    var el = this.renderTemplate('price', {});
    for (var r = 0; r < price; r += 1) {
      el.append('$');
    }
    return el;
  }

  replaceElement(parent, content) {
    parent.innerHTML = '';
    parent.append(content);
  }

  rerender() {
    this.router.navigate(
      document.location.pathname + '?' + new Date().getTime()
    );
  }

  addRestaurant(data) {
    return addDoc(collection(this.firestore, 'restaurants'), data);
  }

  getAllRestaurants(render?) {
    const allRestaurants = query(
      this.restaurants,
      orderBy('avgRating', 'desc'),
      limit(50)
    );
    this.getDocumentsInQuery(allRestaurants, render);
  }

  getDocumentsInQuery(query, render?) {
    onSnapshot(query, snapshot => {
      if (!snapshot.size) {
        return render();
      }

      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          render(change.doc);
        }
      });
    });
  }

  getRestaurant(id) {
    return getDoc(doc(collection(this.firestore, 'restaurants'), id));
  }

  getFilteredRestaurants(filters, render) {
    let filteredQuery = this.restaurants;

    if (filters.category !== 'Any') {
      filteredQuery = query(
        filteredQuery,
        where('category', '==', filters.category)
      );
    }

    if (filters.city !== 'Any') {
      filteredQuery = query(filteredQuery, where('city', '==', filters.city));
    }

    if (filters.price !== 'Any') {
      filteredQuery = query(
        filteredQuery,
        where('price', '==', filters.price.length)
      );
    }

    if (filters.sort === 'Rating') {
      filteredQuery = query(filteredQuery, orderBy('avgRating', 'desc'));
    } else if (filters.sort === 'Reviews') {
      filteredQuery = query(filteredQuery, orderBy('numRatings', 'desc'));
    }

    this.getDocumentsInQuery(filteredQuery, render);
  }

  addRating(restaurantID, rating) {
    const restaurants = collection(this.firestore, 'restaurants');
    const document = doc(restaurants, restaurantID);
    const newRatingDocument = doc(collection(document, 'ratings'));

    return runTransaction(this.firestore, transaction => {
      return transaction.get(document).then(doc => {
        const data = doc.data()!;

        const newAverage =
          (data.numRatings * data.avgRating + rating.rating) /
          (data.numRatings + 1);

        transaction.update(document, {
          numRatings: data.numRatings + 1,
          avgRating: newAverage
        });
        return transaction.set(newRatingDocument, rating);
      });
    });
  }

  /**
   * Adds a set of mock Restaurants to the Firestore.
   */
  addMockRestaurants() {
    var promises: Array<Promise<DocumentReference>> = [];

    for (var i = 0; i < 20; i++) {
      var name =
        FriendlyEats.getRandomItem(this.data.words) +
        ' ' +
        FriendlyEats.getRandomItem(this.data.words);
      var category = FriendlyEats.getRandomItem(this.data.categories);
      var city = FriendlyEats.getRandomItem(this.data.cities);
      var price = Math.floor(Math.random() * 4) + 1;
      var photoID = Math.floor(Math.random() * 22) + 1;
      var photo =
        'https://storage.googleapis.com/firestorequickstarts.appspot.com/food_' +
        photoID +
        '.png';
      var numRatings = 0;
      var avgRating = 0;

      var promise = this.addRestaurant({
        name: name,
        category: category,
        price: price,
        city: city,
        numRatings: numRatings,
        avgRating: avgRating,
        photo: photo
      });

      if (!promise) {
        alert('addRestaurant() is not implemented yet!');
        return Promise.reject();
      } else {
        promises.push(promise);
      }
    }

    return Promise.all(promises);
  }

  /**
   * Adds a set of mock Ratings to the given Restaurant.
   */
  addMockRatings(restaurantID) {
    var ratingPromises: Promise<unknown>[] = [];
    for (var r = 0; r < 5 * Math.random(); r++) {
      var rating = this.data.ratings[
        Math.floor(this.data.ratings.length * Math.random())
      ];
      rating.userName = 'Bot (Web)';
      rating.timestamp = new Date();
      rating.userId = this.auth.currentUser!.uid;
      ratingPromises.push(this.addRating(restaurantID, rating));
    }
    return Promise.all(ratingPromises);
  }
}

window.onload = () => {
  new FriendlyEats().init();
};
