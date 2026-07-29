import React, { useState, useEffect, useContext } from 'react';
import { Star, ThumbsUp, MessageSquare, CheckCircle, User as UserIcon, X, Calendar, Image as ImageIcon } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './ReviewSection.css';

const ReviewSection = ({ hotelId, hotelRating, totalReviews }) => {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, title: '', description: '', stayDate: '' });

  useEffect(() => {
    fetchReviews();
  }, [hotelId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_NODE_API_URL || ''}/api/reviews/hotel/${hotelId}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to write a review');
      return;
    }
    if (!newReview.title || !newReview.description || !newReview.stayDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_NODE_API_URL || ''}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          hotelId,
          ...newReview
        })
      });

      if (response.ok) {
        toast.success('Review submitted successfully!');
        setIsModalOpen(false);
        setNewReview({ rating: 5, title: '', description: '', stayDate: '' });
        fetchReviews();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Error submitting review');
    }
  };

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.rating) === star).length
  }));

  const calculateOverallRating = () => {
    if (reviews.length === 0) return hotelRating;
    const total = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

  const currentTotalReviews = reviews.length > 0 ? reviews.length : totalReviews;

  return (
    <div className="review-section">
      <div className="review-header-container">
        <div>
          <h2 className="review-section-title">Customer Reviews</h2>
          <p className="review-subtitle">See what others are saying about their stay</p>
        </div>
        <button className="btn btn-primary write-review-btn" onClick={() => setIsModalOpen(true)}>
          Write a Review
        </button>
      </div>

      <div className="review-summary-card">
        <div className="overall-rating-box">
          <div className="rating-number">{calculateOverallRating()}</div>
          <div className="rating-stars">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} fill={i < Math.round(calculateOverallRating()) ? "#fbbf24" : "none"} color="#fbbf24" />
            ))}
          </div>
          <div className="total-reviews-text">Based on {currentTotalReviews} reviews</div>
        </div>
        <div className="rating-bars">
          {ratingCounts.map(item => (
            <div key={item.star} className="rating-bar-row">
              <span className="star-label">{item.star} <Star size={12} fill="currentColor" /></span>
              <div className="bar-container">
                <div 
                  className="bar-fill" 
                  style={{ width: `${reviews.length > 0 ? (item.count / reviews.length) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="count-label">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="reviews-list">
        {loading ? (
          <div className="skeleton-loader">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="empty-reviews">
            <MessageSquare size={48} className="empty-icon" />
            <h3>No reviews yet</h3>
            <p>Be the first to share your experience at this hotel!</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review._id} className="review-card">
              <div className="review-card-header">
                <div className="reviewer-info">
                  <div className="reviewer-avatar">
                    {review.userAvatar ? (
                      <img src={review.userAvatar} alt={review.userName} />
                    ) : (
                      <UserIcon size={24} />
                    )}
                  </div>
                  <div>
                    <div className="reviewer-name-row">
                      <h4>{review.userName}</h4>
                      {review.verifiedBooking && (
                        <span className="verified-badge"><CheckCircle size={14}/> Verified</span>
                      )}
                    </div>
                    <div className="review-date">
                      {new Date(review.stayDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="review-rating">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill={i < review.rating ? "#fbbf24" : "none"} color="#fbbf24" />
                  ))}
                </div>
              </div>
              
              <h5 className="review-title">{review.title}</h5>
              <p className="review-description">{review.description}</p>
              
              <div className="review-actions">
                <button className="helpful-btn"><ThumbsUp size={14}/> Helpful ({review.helpfulCount})</button>
              </div>

              {review.adminReply && (
                <div className="admin-reply">
                  <div className="reply-header">
                    <span className="admin-badge">Hotel Management</span>
                    <span className="reply-date">{new Date(review.adminReply.date).toLocaleDateString()}</span>
                  </div>
                  <p className="reply-text">{review.adminReply.text}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="review-modal-overlay">
          <div className="review-modal-content">
            <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>
              <X size={24} />
            </button>
            <h3>Write a Review</h3>
            <form onSubmit={handleReviewSubmit} className="review-form">
              <div className="form-group">
                <label>Overall Rating</label>
                <div className="star-rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={32}
                      className="cursor-pointer transition-colors"
                      fill={star <= newReview.rating ? "#fbbf24" : "none"}
                      color={star <= newReview.rating ? "#fbbf24" : "#9ca3af"}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Title of your review</label>
                <input 
                  type="text" 
                  placeholder="Summarize your experience" 
                  value={newReview.title}
                  onChange={(e) => setNewReview({...newReview, title: e.target.value})}
                  className="form-input"
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label>Details of your stay</label>
                <textarea 
                  placeholder="What did you like or dislike? How was the service?" 
                  value={newReview.description}
                  onChange={(e) => setNewReview({...newReview, description: e.target.value})}
                  className="form-textarea"
                  rows={4}
                  maxLength={1000}
                />
              </div>
              <div className="form-group">
                <label>When did you stay?</label>
                <div className="date-input-wrapper">
                  <Calendar size={18} className="input-icon" />
                  <input 
                    type="date" 
                    value={newReview.stayDate}
                    onChange={(e) => setNewReview({...newReview, stayDate: e.target.value})}
                    className="form-input with-icon"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block submit-review-btn">
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
