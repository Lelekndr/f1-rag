


const Bubble = ({message}) =>{
    return (
        <div className={`bubble ${message.role}`}>
            <p>{message.content}</p>
        </div>
    )
}

export default Bubble;