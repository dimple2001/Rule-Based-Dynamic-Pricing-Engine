import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockHotels } from '../data/mockHotels';
import { ArrowLeft, Star, MapPin, Check, TrendingUp, TrendingDown, Clock, ShieldCheck, Heart } from 'lucide-react';
import ReviewSection from './ReviewSection';
import './HotelDetail.css';

const HotelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [quoteData, setQuoteData] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState(null);
  const [checkInDate, setCheckInDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    const foundHotel = mockHotels.find(h => h.id === id);
    setHotel(foundHotel);
  }, [id]);

  const durationDays = (() => {
    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    const diff = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
    return Number.isFinite(diff) && diff > 0 ? diff : 1;
  })();

  useEffect(() => {
    if (!hotel) return;

    const fetchQuote = async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      const ml = hotel.ml;
      const dayOfWeek = new Date(checkInDate).toLocaleDateString('en-US', { weekday: 'long' });
      const payload = {
        base_price: hotel.pricing.basePrice,
        day_of_week: dayOfWeek,
        hotel: ml.hotel,
        season: ml.season,
        adults: ml.adults,
        children: ml.children,
        babies: ml.babies,
        market_segment: ml.market_segment,
        lead_time: ml.lead_time,
        duration_days: durationDays,
      };

      let lastErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL || ''}/api/calculate-price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }
          const data = await response.json();
          setQuoteData(data);
          setQuoteLoading(false);
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      setQuoteError(lastErr ? lastErr.message : 'Unable to fetch quote');
      setQuoteLoading(false);
    };

    fetchQuote();
  }, [hotel, checkInDate, checkOutDate, durationDays]);

  if (!hotel) {
    return (
      <div className="hotel-detail-loading">
        <div className="container">
          <h2>Loading or Hotel not found...</h2>
          <button onClick={() => navigate('/')} className="btn btn-outline">Back to Home</button>
        </div>
      </div>
    );
  }

  const { name, location, rating, reviews, image, amenities, pricing, category } = hotel;
  const { basePrice, currency, dynamicFactors } = pricing;
  const currentPrice = quoteData?.daily_rate ?? quoteData?.final_price;
  const hasQuote = Number.isFinite(currentPrice);
  const shownDemand = quoteData?.predicted_demand;
  const demandLevel = String(shownDemand || 'medium').toLowerCase();
  const checkInDayLabel = new Date(checkInDate).toLocaleDateString('en-US', { weekday: 'long' });
  const isDiscounted = hasQuote && currentPrice < basePrice;
  const isSurged = hasQuote && currentPrice > basePrice;
  const percentDiff = hasQuote ? Math.round(Math.abs((currentPrice - basePrice) / basePrice * 100)) : 0;
  const onReserve = () => {
    if (!quoteData) return;
    navigate(`/reserve/${id}`, {
      state: {
        checkInDate,
        checkOutDate,
        pricingQuote: quoteData,
      },
    });
  };

  return (
    <div className="hotel-detail-page">
      <div className="container">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} /> Back
        </button>

        <div className="hotel-detail-header">
          <div>
            <div className="category-tag">{category}</div>
            <h1 className="hotel-detail-title">{name}</h1>
            <div className="hotel-detail-meta">
              <span className="meta-item"><MapPin size={16} /> {location}</span>
              <span className="meta-item rating">
                <Star size={16} fill="#fbbf24" color="#fbbf24" /> 
                {rating} ({reviews} reviews)
              </span>
            </div>
          </div>
          <button className="btn btn-outline like-btn">
            <Heart size={20} /> Save
          </button>
        </div>

        <div className="hotel-detail-image-grid">
          <div className="main-image">
            <img src={hotel.images ? hotel.images[0] : image} alt={name} />
          </div>
          <div className="side-images">
            <img src={hotel.images && hotel.images[1] ? hotel.images[1] : `${image}&auto=format&fit=crop&w=400&q=80`} alt={`${name} view 2`} />
            <img src={hotel.images && hotel.images[2] ? hotel.images[2] : (hotel.images && hotel.images[1] ? hotel.images[1] : `${image}&auto=format&fit=crop&w=400&q=80`)} alt={`${name} view 3`} />
          </div>
        </div>

        <div className="hotel-detail-content">
          <div className="hotel-detail-main">
            <section className="detail-section">
              <h2>About this place</h2>
              <p>Experience the ultimate getaway at {name}, located in the beautiful {location}. This premium property offers top-notch facilities and a memorable stay for all guests. Enjoy breathtaking views and exceptional service tailored just for you.</p>
            </section>

            <section className="detail-section">
              <h2>Amenities</h2>
              <div className="amenities-grid">
                {amenities.map((amenity, index) => (
                  <div key={index} className="amenity-item">
                    <Check size={18} className="text-primary" /> {amenity}
                  </div>
                ))}
              </div>
            </section>
            
            <ReviewSection hotelId={id} hotelRating={rating} totalReviews={reviews} />
          </div>

          <div className="hotel-detail-sidebar">
            <div className="booking-card">
              <div className="booking-card-header">
                <div className="price-display">
                  {isDiscounted || isSurged ? (
                    <span className="old-price">{currency}{basePrice}</span>
                  ) : null}
                  <span className={`new-price ${isDiscounted ? 'text-discount' : isSurged ? 'text-surge' : ''}`}>
                    {hasQuote ? `${currency}${currentPrice}` : '...'}
                  </span>
                  <span className="per-night">/ night</span>
                </div>
                
                <div className="pricing-badges">
                  {isDiscounted && (
                    <span className="badge badge-discount">
                      <TrendingDown size={14} /> {percentDiff}% OFF
                    </span>
                  )}
                  {isSurged && shownDemand && (
                    <span className={`badge badge-demand badge-${demandLevel}`}>
                      <TrendingUp size={14} /> {demandLevel.toUpperCase()} Demand
                    </span>
                  )}
                </div>
              </div>

              <div className="dynamic-pricing-insight">
                <h4>Pricing Insight</h4>
                <ul>
                  <li><Clock size={14}/> <strong>Season:</strong> {dynamicFactors.season}</li>
                  <li><TrendingUp size={14}/> <strong>Demand Level:</strong> {shownDemand ? String(shownDemand).toLowerCase() : 'loading...'}</li>
                  <li><ShieldCheck size={14}/> <strong>Check-in Day:</strong> {checkInDayLabel}</li>
                </ul>
              </div>
              {quoteLoading ? (
                <p className="no-charge-text">Fetching live quote...</p>
              ) : null}
              {quoteError ? (
                <p className="no-charge-text" style={{ color: '#ef4444' }}>Live quote unavailable: {quoteError}</p>
              ) : null}

              <div className="booking-dates">
                <div className="date-input">
                  <label>Check-in</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => {
                      const nextIn = e.target.value;
                      setCheckInDate(nextIn);
                      if (new Date(checkOutDate) <= new Date(nextIn)) {
                        const d = new Date(nextIn);
                        d.setDate(d.getDate() + 1);
                        setCheckOutDate(d.toISOString().split('T')[0]);
                      }
                    }}
                  />
                </div>
                <div className="date-input">
                  <label>Check-out</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    min={checkInDate}
                    onChange={(e) => {
                      const nextOut = e.target.value;
                      if (new Date(nextOut) <= new Date(checkInDate)) {
                        const d = new Date(checkInDate);
                        d.setDate(d.getDate() + 1);
                        setCheckOutDate(d.toISOString().split('T')[0]);
                      } else {
                        setCheckOutDate(nextOut);
                      }
                    }}
                  />
                </div>
              </div>
              
              <button 
                className="btn btn-primary btn-block reserve-btn"
                onClick={onReserve}
                disabled={!quoteData || quoteLoading}
              >
                Reserve Now
              </button>
              
              <p className="no-charge-text">You won't be charged yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetail;
