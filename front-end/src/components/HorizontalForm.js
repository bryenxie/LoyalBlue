import React, { Component } from 'react';
import fire from '../config/Fire';
import './App.css';
import Select from 'react-select';
import PlacesAutocomplete from 'react-places-autocomplete';
import Geosuggest from 'react-geosuggest';
import axios from 'axios';

import {
    geocodeByAddress,
    geocodeByPlaceId,
    getLatLng,
} from 'react-places-autocomplete';
import cities from '../data/cities';

const transportationOptions = [
    { 'value': 'driving', 'label': 'Driving' },
    { 'value': 'walking', 'label': 'Walking' },
    { 'value': 'bicycling', 'label': 'Biking' },
    { 'value': 'transit', 'label': 'Transit' },
]

const selectStyles = {
    option: (provided, state) => ({
        ...provided,
        color: state.isSelected ? '#ffc107' : '#00205b',
    }),
}

class HorizontalForm extends Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.handleAddressChange = this.handleAddressChange.bind(this);
        this.submitForm = this.submitForm.bind(this);
        this.renderMessage = this.renderMessage.bind(this);
        this.state = {
            userInfo: null,
            userPhone: '',
            selectedAirport: this.props.selectedAirport,
            selectedOption: null,
            selectedTrans: null,
            selectedAddress: null,
            address: '',
            addressOptions: [],
            options: [],
            datetime: null,
            show: false,
            fullname: '',
            allowSMS: false,
        }
    }

    componentDidMount() {
        fire.auth().onAuthStateChanged((user) => {
            if (user) {
                this.setState({ userInfo: user });
                const userRef = fire.database().ref('user');
                userRef.on('value', (snapshot) => {
                    for (let userItem in snapshot.val()) {
                        if (snapshot.val()[userItem] != null) {
                            if (snapshot.val()[userItem].email === this.state.userInfo.email) {
                                this.setState({
                                    userPhone: snapshot.val()[userItem].phone,
                                    fullname: snapshot.val()[userItem].firstName + ' ' + snapshot.val()[userItem].lastName
                                })
                            }
                        }
                    }
                });
            } else {
                this.setState({ user: null });

            }
        });



        // Fetch airport data from json
        var arr = []
        for (let data in cities['Airports']) {
            arr.push({ 'value': data, 'label': cities['Airports'][data]['Name'] + ' - ' + data })
        }
        this.setState({
            options: arr
        })
    }
    handleChange = (selectedOption) => {
        this.setState({ selectedOption });
    }
    handleAddressChange(e) {

        this.setState({ address: e.target.value });

    }
    renderMessage = (e) => {
        this.props.renderTitle(e);
    }

    handleDateChange = (field, e) => {
        this.setState({ [field]: e.target.value });
    };
    handleTransChange = (selectedTrans) => {
        this.setState({ selectedTrans });
    }

    buttonClick = () => {
        this.props.onTitleClick('signup');
    }

    handleAddressSelect = address => {
        geocodeByAddress(address)
            .then(results => getLatLng(results[0]))
            .then(latLng => console.log('Success', latLng))
            .catch(error => console.error('Error', error));
    };

    submitForm(e) {
        e.preventDefault();
        // Format Address First
        axios.get('https://maps.googleapis.com/maps/api/geocode/json?address=' + this.state.address + '&key=AIzaSyDtjpZsOSLjHzFbVBO44XIAe6blIkx3xmw')
            .then(res => {
                this.setState({
                    address: res.data.results[0].formatted_address
                })
                console.log(res.data.results[0].formatted_address, this.state.selectedOption, this.state.date, this.state.selectedTrans)

                // Call our ML API
                axios.post('http://35.247.102.5/predict', {
                    address: res.data.results[0].formatted_address,
                    airport: this.state.selectedOption.value,
                    date: this.state.datetime,
                    transportation: this.state.selectedTrans.value,
                    fullname: this.state.fullname
                })
                    .then(res2 => {
                        { this.renderMessage((res2.data).split(".")[1])}
                        axios.post('http://35.247.102.5/sms', {
                            number: this.state.userPhone,
                            body: res2.data
                        })

                            .then(res3 => {
                                console.log(res3)
                            })

                    })
            })

            .catch(err => {
                alert('There is an error in the input')
            })
    }

    render() {
        const { selectedOption, selectedTrans, selectedAirport } = this.state;
        return (
            <div>
                <div style={{ 'marginTop': '23em' }} className="container formBox">
                    <h4 style={{ marginBottom: '1em' }}>Tell me where you are going!</h4>
                    <form role="form">
                        <div className="row">
                            <div className="col-md-3">
                                <div className="form-group">
                                    <label for="exampleInputEmail1">Leaving From</label>
                                    <input value={this.state.address} onChange={this.handleAddressChange} type="text" name="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp" />
                                    <small id="helper" className="form-text">From where you are leaving for the airport?</small>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="form-group">
                                    <label for="exampleInputEmail1">Departing Airport</label>
                                    <Select
                                        styles={selectStyles}
                                        value={selectedAirport}
                                        onChange={this.handleChange}
                                        options={this.state.options}
                                        required
                                    />
                                    <small id="helper" class="form-text">Where are you taking the flight?</small>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div class="form-group">
                                    <label for="exampleInputEmail1">Flight Time</label>
                                    <input value={this.state.date} onChange={e => this.handleDateChange('datetime', e)} type="datetime-local" name="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp" />
                                    <small id="helper" class="form-text">When is the flight time?</small>
                                </div>
                            </div>
                            <div className="col-md-2">
                                <div class="form-group">
                                    <label for="exampleInputEmail1">Transportation</label>
                                    <Select
                                        styles={selectStyles}
                                        value={selectedTrans}
                                        onChange={this.handleTransChange}
                                        options={transportationOptions}
                                    />
                                    <small id="helper" class="form-text">How are you getting to the airport?</small>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                        </div>

                        <button type="submit" onClick={this.submitForm} class="btn btn-warning">Alert Departure Time</button>
                        <div>
                            <input
                                name="isGoing"
                                type="checkbox"
                                checked={this.state.isGoing}
                                style={{ marginRight: '.25em' }}
                                required
                                onChange={this.handleInputChange} />

                            <label style={{ fontSize: '14px' }}>Text Alert to {this.state.userPhone}</label>

                        </div>
                    </form>


                </div>
            </div>
        );
    }
}
export default HorizontalForm;