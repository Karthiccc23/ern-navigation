import React from 'react';
import {EnNavigationApi} from 'ernnavigation-api';
import AppNavigator from './app-navigator';

/**
 * @class Component
 * @description
 * <u><b>NOTE</b></u>:<br>
 * If overriding <code>componentWillUnmount</code> or <code>componentWillUpdate</code>, you <u><b>must</b></u> call the
 * appropriate super method - <code>super.componentWillUnmount()</code> or
 * <code>super.componentWillUpdate(nextProps, nextState)</code>, respectively.
 * @extends React.Component
 * @property autoReset=true {boolean} - (static) Whether to automatically reset the navigation bar upon component display. (defaults to <code>true</code>)
 * @property navigationOptions {NavigationBar} - (static) The navigation bar for this component.  Defaults to a title of "Untitled" with no right {@link Button}s.
 * @example
 * import { Component } from 'ern-navigation'
 * ...
 * export default MainScreenComponent extends Component {
 *   static displayName = 'Main Screen'
 *   static autoReset = true;
 *   static navigationOptions = {
 *     title: 'My Application',
 *     buttons: [{
 *       icon: Image.resolveAssetSource(exitIcon).uri,
 *       id: 'exit',
 *       location: 'right',
 *       accessibilityLabel: 'Exit this app'
 *     }]
 *   }
 *  onNavButtonPress (buttonId) {
 *    switch (buttonId) {
 *      case 'exit':
 *        this.finish()
 *        break
 *      default:
 *        console.warn(`Screen '${MainScreenComponent.getRegisteredRoute()}' received unmapped button id '${buttonId}'`)
 *        break
 *    }
 *  }
 *   ...
 * }
 */

/**
 * @typedef {Object} NavigationBar
 * @property {string} title - The title for the navigation bar.
 * @property {?boolean} overlay - (optional) Show this page as an overlay (navigate only).
 * @property {Button[]} buttons - The {@link Button}s to display on the right side of the navigation bar.
 * @property {?LeftButton} leftButton - The {@link LeftButton} to display on the left side of the navigation bar.
 */

/**
 * @typedef {Object} Button
 * @property {?string} icon - The location of the icon (use <code>Image.resolveAssetSource(iconFile).uri</code>)
 * or the name of a built-in icon.
 * @property {?string} title - The title for the button; will be used in case of missing or invalid icon.
 * @property {!string} id - The ID of the button; will be used in header button events.  Cannot contain '.'.
 * @property {?string} accessibilityLabel - The text to read out with screen-reader technology.
 */

/**
 * @typedef {Object} LeftButton
 * @property {?string} icon - The location of the icon (use <code>Image.resolveAssetSource(iconFile).uri</code>)
 * or the name of a built-in icon.
 * @property {?string} title - The title for the button (iOS only).
 * @property {?string} id - The ID of the button; will be used in header button events.  If set, the press event must be handled on the Javascript side, as native will no longer handle the back press.  Cannot contain '.'.
 * @property {?string} accessibilityLabel - The text to read out with screen-reader technology.
 */

export const errors = {
  invalidAppNavigator: new Error(
    'The appNavigator has not been set or is not a valid instance of AppNavigator.  Internal navigation is not available.',
  ),
  noValidScreens: new Error(
    'No valid screens have been set.  Internal navigation is not available.',
  ),
  noScreenName: new Error('The screenName is required'),
  invalidScreenName: screenName =>
    new Error(`'${screenName}' is not a valid screen name.`),
};

class Component extends React.Component {
  static appNavigator = undefined;
  static headerListener = undefined;
  static displayName = 'Component';
  static route = '';
  static autoReset = true;
  static navigationOptions = {
    title: 'Untitled',
    buttons: [],
  };

  constructor(props) {
    super(props);
    this.jsonProps = props.jsonPayload ? JSON.parse(props.jsonPayload) : {};
    if (!this.headerListener) {
      this.headerListener = EnNavigationApi.events().addOnNavButtonClickEventListener(
        this.constructor._handleNavButtonPress.bind(this),
      );
    }
    if (this.constructor.autoReset) {
      this.resetNavigationBar();
    }
  }

  componentWillUnmount() {
    if (this.headerListener) {
      EnNavigationApi.events().removeOnNavButtonClickEventListener(
        this.headerListener,
      );
    }
  }

  componentWillUpdate(nextProps) {
    if (this.props.jsonPayload !== nextProps.jsonPayload) {
      this.jsonProps = nextProps.jsonPayload
        ? JSON.parse(nextProps.jsonPayload)
        : {};
    }
  }

  /**
   * Set the registered route for this component.
   *
   * @static
   * @param {string} route - The registered route for this component.
   */
  static setRegisteredRoute(route) {
    if (!this.route) {
      this.route = route;
    } else {
      console.warn(
        `This component has already been registered as '${
          this.route
        }'.  Not re-registering as '${route}'.`,
      );
    }
  }

  /**
   * Get the registered route for this component.
   *
   * @static
   * @returns {string} A string containing the registered route for this component.
   */
  static getRegisteredRoute() {
    return this.route;
  }

  /**
   * Set the {@link AppNavigator} for this component.
   *
   * @param {AppNavigator} appNavigator - The {@link AppNavigator} for this component.
   */
  static setAppNavigator(appNavigator) {
    this.appNavigator = appNavigator;
  }

  /**
   * Get the {@link AppNavigator} for this component.
   *
   * @returns {AppNavigator} The {@link AppNavigator} for this component.
   */
  static getAppNavigator() {
    return this.appNavigator;
  }

  /**
   * Get an unlocalized version of a button.
   *
   * @private
   * @param {string} buttonId - The ID of the {@link Button} to unlocalize.
   * @example
   * // returns 'ButtonIdentifier'
   * NavigationBar._unlocalizeButtonId('RegisteredRoute.ButtonIdenfifier')
   */
  static _unlocalizeButtonId(buttonId) {
    return buttonId.substring(this.route.length + 1);
  }

  /**
   * Determine whether to dispatch an <code>onNavButtonPress</code> event for a given buttonId.
   *
   * @private
   * @param {string} buttonId - The ID of the {@link Button}.
   */
  static _shouldDispatchButtonPressEvent(buttonId) {
    const lastDot = buttonId.lastIndexOf('.');
    const buttonRoute = lastDot > -1 ? buttonId.substring(0, lastDot) : '';
    return buttonRoute === this.getRegisteredRoute();
  }

  /**
   * Make a call to <code>onNavButtonPress(buttonId)</code> (if available) whenever a button is
   * pressed in the navigation bar.  This is called automatically whenever an event
   * is fired by the OnNavButtonClickEventListener.
   *
   * If a subclassed instance contains the <code>onNavButtonPress</code> method, that will be
   * called, otherwise the class's static method will be called.
   *
   * @private
   * @param {string} buttonId - The ID of the {@link Button} that was pressed.
   */
  static _handleNavButtonPress(buttonId) {
    if (this.constructor._shouldDispatchButtonPressEvent(buttonId)) {
      const handler =
        this.onNavButtonPress || this.constructor.onNavButtonPress;
      if (handler) {
        handler.bind(this)(this.constructor._unlocalizeButtonId(buttonId));
      }
    }
  }

  /**
   * Get a localized version of the navigation bar for the given route.
   *
   * @private
   * @instance
   * @param {string} routeName - The name of the current route.
   * @param {NavigationBar} navigationBar - The {@link NavigationBar} object to localize.
   * @returns {NavigationBar} A {@link NavigationBar} object with the IDs of buttons updated to
   * pertain to the given route.
   */
  static _localizeNavigationBar(routeName, navigationBar) {
    if (!navigationBar) {
      return {};
    }
    return {
      ...navigationBar,
      leftButton: navigationBar.leftButton
        ? {
            ...navigationBar.leftButton,
            id: navigationBar.leftButton.id
              ? `${routeName}.${navigationBar.leftButton.id}`
              : undefined,
          }
        : undefined,
      buttons: navigationBar.buttons
        ? navigationBar.buttons.map(button => ({
            ...button,
            location: 'right',
            id: `${routeName}.${button.id}`,
          }))
        : undefined,
    };
  }

  /**
   * Get the navigation bar for the given route.
   *
   * @private
   * @static
   * @param {Object} jsonPayload - The JSON payload for the current route.
   * @returns {NavigationBar} A {@link NavigationBar} object for the given route.
   */
  static _getNavigationBar(jsonPayload) {
    return {
      ...this.navigationOptions,
      title:
        this.getDynamicTitle(jsonPayload) ||
        (this.navigationOptions || {}).title,
    };
  }

  /**
   * Get a localized version of the navigation bar for this route.
   *
   * @private
   * @instance
   * @param {Object} jsonPayload - The JSON payload for the current route.
   * @returns {NavigationBar} A {@link NavigationBar} object with the IDs of buttons updated to
   * pertain to the current route.
   */
  static _getLocalizedNavigationBar(jsonPayload) {
    return this._localizeNavigationBar(
      this.route,
      this._getNavigationBar(jsonPayload),
    );
  }

  /**
   * Calculate the title for the current route based on the JSON payload.
   * Must be overriden in subclasses.
   *
   * @abstract
   * @static
   * @param {Object} jsonPayload - The JSON payload for the current route.
   */
  static getDynamicTitle(jsonPayload) {}

  /**
   * Handle button press events.
   * Must be overriden in subclasses.
   *
   * @abstract
   * @static
   * @param {string} buttonId - The ID of the button which was pressed.
   */
  static onNavButtonPress(buttonId) {
    console.warn(
      `\`onNavButtonPress(buttonId)\` was not overriden in ${
        this.constructor.name
      }, but a button press event was fired.`,
      {buttonId},
    );
  }

  /**
   * Reset the navigation bar for the current screen to its defaults.
   *
   * @async
   * @instance
   * @return {Promise} A <code>Promise</code> which will resolve or reject upon attempting to
   * reset the navigation bar.
   */
  resetNavigationBar() {
    return this.updateNavigationBar(this.constructor._getNavigationBar());
    // return EnNavigationApi.requests().update({
    //   path: this.constructor.route,
    //   navigationBar: this.constructor._getLocalizedNavigationBar(),
    // });
  }

  /**
   * Update the navigation bar for the current screen.
   *
   * @async
   * @instance
   * @param {NavigationBar} navigationBar - The {@link NavigationBar} object.
   * @return {Promise} A <code>Promise</code> which will resolve or reject upon attempting to
   * update the navigation bar.
   */
  updateNavigationBar(navigationBar) {
    const {
      overlay,
      ...localizedNavigationBar
    } = this.constructor._localizeNavigationBar(
      this.constructor.route,
      navigationBar,
    );
    const routePayload = {
      path: this.constructor.route,
      navigationBar: localizedNavigationBar,
    };
    return EnNavigationApi.requests().update(routePayload);
  }

  /**
   * Navigate to a given route.
   *
   * @async
   * @instance
   * @param {Object} route - The route object that details where to navigate next.
   * @return {Promise} A <code>Promise</code> which will resolve or reject upon attempting to
   * navigate to the given route.
   */
  navigate(route) {
    return EnNavigationApi.requests().navigate(route);
  }

  /**
   * Navigate to an internal screen.
   *
   * @async
   * @instance
   * @param {string} screenName - The name of the screen to navigate to; these names
   * should be defined in the initial {@link AppNavigator} setup.
   * @param {Object} [jsonPayload] - (optional) The JSON payload with props to send to the new
   * screen.
   * @return {Promise} A <code>Promise</code> which will resolve or reject upon attempting to
   * navigate to the new screen.
   */
  navigateInternal(screenName, jsonPayload) {
    if (!this.constructor.getAppNavigator()) {
      throw errors.invalidAppNavigator;
    }
    if (!(this.constructor.getAppNavigator() instanceof AppNavigator)) {
      throw errors.invalidAppNavigator;
    }
    if (
      !this.constructor.getAppNavigator().screens ||
      Object.keys(this.constructor.getAppNavigator().screens).length < 1
    ) {
      throw errors.noValidScreens;
    }
    if (!screenName) {
      throw errors.noScreenName;
    }
    if (
      !Object.keys(this.constructor.getAppNavigator().screens).includes(
        screenName,
      )
    ) {
      throw errors.invalidScreenName(screenName);
    }

    const nav = this.constructor.getAppNavigator().screens[screenName];
    const {overlay, ...navigationBar} = nav._getLocalizedNavigationBar(
      jsonPayload,
    );
    const routePayload = {
      path: nav.getRegisteredRoute(),
      overlay,
      navigationBar,
      jsonPayload: JSON.stringify(jsonPayload || {}),
    };
    return EnNavigationApi.requests().navigate(routePayload);
  }

  /**
   * Go back to a specified screen.
   *
   * @async
   * @instance
   * @param {string} screenName - The name of the screen to navigate to; these names
   * should be defined in the initial {@link AppNavigator} setup.
   * @return {Promise} A <code>Promise</code> which will resolve or reject upon attempting to
   * go back to the specified screen.
   */
  backTo(screenName) {
    if (!this.constructor.getAppNavigator()) {
      throw errors.invalidAppNavigator;
    }
    if (!(this.constructor.getAppNavigator() instanceof AppNavigator)) {
      throw errors.invalidAppNavigator;
    }
    if (
      !this.constructor.getAppNavigator().screens ||
      Object.keys(this.constructor.getAppNavigator().screens).length < 1
    ) {
      throw errors.noValidScreens;
    }
    if (!screenName) {
      throw errors.noScreenName;
    }
    if (
      !Object.keys(this.constructor.getAppNavigator().screens).includes(
        screenName,
      )
    ) {
      throw errors.invalidScreenName(screenName);
    }

    return EnNavigationApi.requests().back({
      path: this.constructor
        .getAppNavigator()
        .screens[screenName].getRegisteredRoute(),
    });
  }

  /**
   * Go back one screen.
   *
   * @async
   * @instance
   * @return {Promise} A <code>Promise</code> which will resolve or reject upon attempting to
   * go back one screen.
   */
  back() {
    return EnNavigationApi.requests().back();
  }

  /**
   * Finish this flow.
   *
   * @async
   * @instance
   * @param {Object} [payload] - (optional) The JSON payload to send to the native activity or view
   * controller that launched the flow.
   * @return {Promise} A <code>Promise</code> which will resolve or reject upon attempting to
   * finish the current flow.
   */
  finish(payload) {
    return EnNavigationApi.requests().finish(JSON.stringify(payload || {}));
  }
}

export default Component;
