import React, { useState, useEffect, useContext } from 'react';
import { Trash2, MessageSquare, Search, Filter, Star, CheckCircle, Clock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './ReviewManagementDashboard.css';

const ReviewManagementDashboard = () => {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_NODE_API_URL || ''}/api/reviews`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Failed to fetch all reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_NODE_API_URL || ''}/api/reviews/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success('Review deleted');
        setReviews(reviews.filter(r => r._id !== id));
      } else {
        toast.error('Failed to delete review');
      }
    } catch (error) {
      toast.error('Error deleting review');
    }
  };

  const handleReply = async (id) => {
    if (!replyText.trim()) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_NODE_API_URL || ''}/api/reviews/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: replyText })
      });
      if (response.ok) {
        toast.success('Reply added');
        setReplyingTo(null);
        setReplyText('');
        fetchReviews();
      } else {
        toast.error('Failed to add reply');
      }
    } catch (error) {
      toast.error('Error adding reply');
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Reviews Management</h1>
          <p>Monitor and respond to customer feedback across all properties.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><MessageSquare size={24} /></div>
            <div className="stat-info">
              <h3>Total Reviews</h3>
              <div className="stat-value">{reviews.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Star size={24} color="#fbbf24" fill="#fbbf24" /></div>
            <div className="stat-info">
              <h3>Average Rating</h3>
              <div className="stat-value">{averageRating}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><CheckCircle size={24} /></div>
            <div className="stat-info">
              <h3>Replied</h3>
              <div className="stat-value">
                {reviews.filter(r => r.adminReply).length}
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-controls">
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search reviews by user, title, or content..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-outline filter-btn">
            <Filter size={18} /> Filter
          </button>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="table-loading">Loading reviews data...</div>
          ) : (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>User & Rating</th>
                  <th>Review Details</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">No reviews found matching your search.</td>
                  </tr>
                ) : (
                  filteredReviews.map(review => (
                    <React.Fragment key={review._id}>
                      <tr>
                        <td>
                          <div className="user-cell">
                            <span className="user-name">{review.userName}</span>
                            <div className="rating-stars-small">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} fill={i < review.rating ? "#fbbf24" : "none"} color="#fbbf24" />
                              ))}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="review-content-cell">
                            <strong>{review.title}</strong>
                            <p>{review.description.length > 80 ? review.description.substring(0, 80) + '...' : review.description}</p>
                          </div>
                        </td>
                        <td>
                          <div className="date-cell">
                            <Clock size={14} />
                            {new Date(review.stayDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          {review.adminReply ? (
                            <span className="status-badge replied">Replied</span>
                          ) : (
                            <span className="status-badge pending">Pending</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            {!review.adminReply && (
                              <button 
                                className="action-btn reply-btn"
                                onClick={() => setReplyingTo(replyingTo === review._id ? null : review._id)}
                              >
                                Reply
                              </button>
                            )}
                            <button 
                              className="action-btn delete-btn"
                              onClick={() => handleDelete(review._id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {replyingTo === review._id && (
                        <tr className="reply-row">
                          <td colSpan="5">
                            <div className="reply-editor-container">
                              <textarea 
                                className="reply-textarea"
                                placeholder={`Write a response to ${review.userName}...`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                              />
                              <div className="reply-actions">
                                <button className="btn btn-outline" onClick={() => setReplyingTo(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={() => handleReply(review._id)}>Send Reply</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewManagementDashboard;
