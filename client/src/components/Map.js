import React, { useState, useEffect, useContext } from "react";
import ReactMapGL, { NavigationControl, Marker, Popup } from 'react-map-gl'
import { withStyles } from "@material-ui/core/styles";
import differenceInMinutes from 'date-fns/difference_in_minutes'
import Button from "@material-ui/core/Button";
import DeleteIcon from "@material-ui/icons/DeleteTwoTone";
/* import useMediaQuery from '@material-ui/core/useMediaQuery' */
import {Subscription} from 'react-apollo'


import {useClient} from '../client'
import { GET_PINS_QUERY } from '../graphql/queries' 
import { DELETE_PIN_MUTATION } from '../graphql/mutations'
import * as sub from '../graphql/subscriptions'

import PinIcon from './PinIcon'
import Blog from './Blog'
import Context from '../context'
import { Typography } from "@material-ui/core";

const INITIAL_VIEWPORT = {
  latitude: 37.7577,
  longitude: -122.4376,
  zoom: 13
}

const Map = ({ classes }) => {
  const client = useClient()
 /*  const mobileSize = useMediaQuery('(max-width: 650px)') */
  const { state, dispatch } = useContext(Context)
  useEffect(() => {
    getPins()
  }, [])
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT)
  const [userPosition, setUserPosition] = useState(null)
  useEffect(() => {
    getUserPosition()
  }, [])

  const [popUp, setPopUp] = useState(null)
  useEffect(() => {
    const pinExists = popUp && state.pins.findIndex(pin => pin._id === popUp._id) > -1 
    if (!pinExists){
      setPopUp(null)
    }
  }, [state.pins.length])

  const getUserPosition = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(position => {
        const {latitude, longitude} = position.coords
        setViewport({ ...viewport, latitude, longitude})
        setUserPosition({latitude,longitude})
      })
    }
  }

  const getPins = async () => {
    const { getPins } = await client.request(GET_PINS_QUERY)
    dispatch({ type: "GET_PINS", payload: getPins})
  }

  const handleMapClick = ({ lngLat, leftButton }) => {
    if (!leftButton) return
    if (!state.draft){
       dispatch({ type: "CREATE_DRAFT" })
    }
    const [longitude, latitude] = lngLat
    dispatch({ 
      type: "UPDATE_DRAFT_LOCATION",
      payload: {longitude, latitude} 
  })
  }

  const highlightNewPin = pin => {
      const isNewPin = differenceInMinutes(Date.now(), Number(pin.createdAt)) <= 30
      return isNewPin ? "limegreen" : "darkblue"
  }

  const handleSelectPin = pin => {
    setPopUp(pin)
    dispatch({ type: "SET_PIN", payload: pin })
  }

  const handleDeletePin = async pin => {
    const variables = { pinId: pin._id }
    await client.request(DELETE_PIN_MUTATION, variables)
/*     const { deletePin } = await client.request(DELETE_PIN_MUTATION, variables)
    dispatch({ type: "DELETE_PIN", payload: deletePin}) */
    setPopUp(null)
  }

  const isAuthUser = () => state.currentUser._id === popUp.author._id

  return (
    <div className={classes.root}>
      <ReactMapGL
        mapboxApiAccessToken="pk.eyJ1IjoianNhcmVsYXMiLCJhIjoiY2p3c2lmZGllMDJ0dzN5cGpkOWF0Ync0eSJ9.p82e9e2xDiIhvOe6GSLi6g"
        width="100vw"
        height="calc(100vh - 64px)"
        mapStyle="mapbox://styles/mapbox/streets-v9"
        {...viewport}
        onViewportChange={newViewport => setViewport(newViewport)}
        onClick={handleMapClick}
      >
        <div className={classes.navigationControl}>
          <NavigationControl 
            onViewportChange={newViewport => setViewport(newViewport)}
          />
        </div>
        {userPosition && (
          <Marker
            latitude={userPosition.latitude}
            longitude={userPosition.longitude}
            offsetLeft={-19}
            offsetTop={-37}
          >
            <PinIcon size={40} color="red" />
          </Marker>
        )}

        {state.draft && (
          <Marker
            latitude={state.draft.latitude}
            longitude={state.draft.longitude}
            offsetLeft={-19}
            offsetTop={-37}
          >
            <PinIcon size={40} color="hotpink" />
          </Marker>
        )}

        {state.pins.map(pin => (
          <Marker
          key={pin._id}
          latitude={pin.latitude}
          longitude={pin.longitude}
          offsetLeft={-19}
          offsetTop={-37}
        >
          <PinIcon 
          onClick={() => handleSelectPin(pin)}
          size={40} 
          color={highlightNewPin(pin)} />
        </Marker>
        ))}

        {/* Popup Dialog for Created Pins */}
        {popUp && (
          <Popup
            anchor="top"
            latitude={popUp.latitude}
            longitude={popUp.longitude}
            closeOnClick={false}
            onClose={() => setPopUp(null)}
          >
            <img 
              className={classes.popupImage}
              src={popUp.image}
              alt={popUp.title}
            />
            <div>
              <Typography>
                {popUp.latitude.toFixed(6)}, 
                {popUp.longitude.toFixed(6)}
              </Typography>
              {isAuthUser() && (
                <Button onClick={() => handleDeletePin(popUp)}>
                  <DeleteIcon className={classes.deleteIcon} />
                </Button>
              )}
            </div>
          </Popup>
        )}

      </ReactMapGL>

      <Subscription
        subscription={sub.PIN_ADDED_SUBSCRIPTION}
        onSubscriptionData={({ subscriptionData }) => {
          const {pinAdded} = subscriptionData.data 
          console.log({pinAdded})
          dispatch({type: "CREATE_PIN", payload: pinAdded})
        }} 
      />

    <Subscription
        subscription={sub.PIN_UPDATED_SUBSCRIPTION}
        onSubscriptionData={({ subscriptionData }) => {
          const {pinUpdated} = subscriptionData.data 
          console.log({pinUpdated})
          dispatch({type: "CREATE_COMMENT", payload: pinUpdated})
        }} 
      />

    <Subscription
        subscription={sub.PIN_DELETED_SUBSCRIPTION}
        onSubscriptionData={({ subscriptionData }) => {
          const {pinDeleted} = subscriptionData.data 
          console.log({pinDeleted})
          dispatch({type: "DELETE_PIN", payload: pinDeleted})
        }} 
      />

      <Blog />
    </div>
  )
};

const styles = {
  root: {
    display: "flex"
  },
  rootMobile: {
    display: "flex",
    flexDirection: "column-reverse"
  },
  navigationControl: {
    position: "absolute",
    top: 0,
    left: 0,
    margin: "1em"
  },
  deleteIcon: {
    color: "red"
  },
  popupImage: {
    padding: "0.4em",
    height: 200,
    width: 200,
    objectFit: "cover"
  },
  popupTab: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column"
  }
};

export default withStyles(styles)(Map);
